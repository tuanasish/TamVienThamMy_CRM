import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateTier } from "../../customers/route";

// GET a single invoice
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        staff: true,
        items: true,
        schedules: true,
      },
    });
    
    if (!invoice) {
      return NextResponse.json({ error: "Không tìm thấy hóa đơn" }, { status: 404 });
    }

    // Check if the items have associated treatments used today
    const dateMin = new Date(invoice.createdAt.getTime() - 10000);
    const dateMax = new Date(invoice.createdAt.getTime() + 10000);

    const itemsWithUsage = await Promise.all(invoice.items.map(async (item) => {
      let useToday = false;
      let technicianId = null;

      if (item.itemType === "service") {
        const treatment = await db.customerTreatment.findFirst({
          where: {
            customerId: invoice.customerId,
            serviceId: item.itemId,
            createdAt: { gte: dateMin, lte: dateMax }
          },
          include: {
            usageLogs: true
          }
        });

        if (treatment && treatment.usageLogs.length > 0) {
          useToday = true;
          technicianId = treatment.usageLogs[0].staffId;
        }
      }

      return {
        ...item,
        useToday,
        technicianId
      };
    }));
    
    return NextResponse.json({
      ...invoice,
      items: itemsWithUsage
    });
  } catch (error: any) {
    console.error("GET Single Invoice Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi lấy thông tin hóa đơn" }, { status: 500 });
  }
}

// PUT to edit invoice details
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      staffId,
      discount = 0,
      paymentType,
      installmentType,
      installmentMonths,
      downPayment = 0,
      bankFee = 0,
      paidAmountCash = 0,
      paidAmountTransfer = 0,
      paidAmountHomeCredit = 0,
      paidAmountMiraeAsset = 0,
      paidAmountDebt = 0,
      paidAmountOffset,
      internalNotes,
      items, // array of items: { id, itemId, itemType, price, quantity, discount, staffId, saleStaffIds }
    } = body;
    
    const updatedInvoice = await db.$transaction(async (tx) => {
      // 1. Fetch existing invoice with items
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true },
      });
      
      if (!invoice) throw new Error("Hóa đơn không tồn tại");
      
      // Fetch customer
      const customer = await tx.customer.findUnique({
        where: { id: invoice.customerId },
        select: { id: true, totalSpent: true },
      });
      if (!customer) throw new Error("Khách hàng không tồn tại");

      const dateMin = new Date(invoice.createdAt.getTime() - 10000);
      const dateMax = new Date(invoice.createdAt.getTime() + 10000);

      // Helper function to delete synced treatment and its logs
      const deleteSyncedTreatment = async (serviceId: string) => {
        const treatments = await tx.customerTreatment.findMany({
          where: {
            customerId: invoice.customerId,
            serviceId,
            createdAt: { gte: dateMin, lte: dateMax }
          }
        });
        for (const tr of treatments) {
          // Delete usage logs
          await tx.usageLog.deleteMany({
            where: { treatmentId: tr.id }
          });
          // Delete treatment
          await tx.customerTreatment.delete({
            where: { id: tr.id }
          });
        }
      };

      // Helper function to delete synced customer card
      const deleteSyncedCard = async (templateId: string) => {
        await tx.customerCard.deleteMany({
          where: {
            customerId: invoice.customerId,
            templateId,
            createdAt: { gte: dateMin, lte: dateMax }
          }
        });
      };

      // Helper function to create synced treatment
      const createSyncedTreatment = async (serviceId: string, price: number, qty: number, disc: number, useToday?: boolean, technicianId?: string | null) => {
        const service = await tx.service.findUnique({
          where: { id: serviceId },
          select: { type: true, tags: true }
        });
        if (service && service.type === "service") {
          const sessions = service.tags && typeof service.tags === "object" && service.tags !== null && "sessions" in service.tags ? Number((service.tags as any).sessions) : 1;
          const totalSessions = qty * sessions;
          const treatment = await tx.customerTreatment.create({
            data: {
              customerId: invoice.customerId,
              serviceId,
              totalSessions,
              usedSessions: useToday ? 1 : 0,
              pricePaid: Math.max((price * qty) - disc, 0),
              createdAt: invoice.createdAt, // Match original invoice date
            }
          });

          if (useToday && technicianId) {
            const tech = await tx.staff.findUnique({
              where: { id: technicianId },
              select: { fullName: true }
            });
            const technicianName = tech?.fullName || "Nhân viên";

            await tx.usageLog.create({
              data: {
                customerId: invoice.customerId,
                serviceId,
                sourceType: "treatment",
                treatmentId: treatment.id,
                sessionsDeducted: 1,
                performedBy: technicianName,
                staffId: technicianId,
                usedAt: invoice.createdAt,
                notes: "Sử dụng ngay khi lập hóa đơn (Cập nhật)",
              }
            });
          }
        }
      };

      // Helper function to create synced card
      const createSyncedCard = async (templateId: string) => {
        const template = await tx.cardTemplate.findUnique({
          where: { id: templateId },
          select: { price: true, value: true }
        });
        if (template) {
          await tx.customerCard.create({
            data: {
              customerId: invoice.customerId,
              templateId,
              originalPrice: template.price,
              originalValue: template.value,
              currentBalance: template.value,
              createdAt: invoice.createdAt, // Match original invoice date
            }
          });
        }
      };

      // 2. Classify items (Added, Removed, Updated)
      const existingItems = invoice.items;
      const incomingItems = items || [];

      // A. Removed Items: in DB but not in incoming payload
      const removedItems = existingItems.filter(
        (ext) => !incomingItems.some((inc: any) => inc.id === ext.id)
      );

      // B. Added Items: id starts with 'new-' or not in DB
      const addedItems = incomingItems.filter(
        (inc: any) => !inc.id || inc.id.toString().startsWith("new-")
      );

      // C. Updated Items: id in DB
      const updatedItems = incomingItems.filter(
        (inc: any) => inc.id && !inc.id.toString().startsWith("new-") && existingItems.some((ext) => ext.id === inc.id)
      );

      // 3. Process REMOVED items
      for (const itm of removedItems) {
        // Delete invoice item
        await tx.invoiceItem.delete({ where: { id: itm.id } });

        // Delete synced customer treatment or customer card
        if (itm.itemType === "service" || itm.itemType === "product") {
          await deleteSyncedTreatment(itm.itemId);
        } else if (itm.itemType === "card") {
          await deleteSyncedCard(itm.itemId);
        }
      }

      // 4. Process ADDED items
      for (const itm of addedItems) {
        const itemPrice = Number(itm.price || 0);
        const itemQty = Number(itm.quantity || 1);
        const itemDiscount = Number(itm.discount || 0);

        // Create invoice item
        await tx.invoiceItem.create({
          data: {
            invoiceId: id,
            itemType: itm.itemType,
            itemId: itm.itemId,
            price: itemPrice,
            quantity: itemQty,
            discount: itemDiscount,
            staffId: itm.staffId || null,
            saleStaffIds: itm.saleStaffIds || [],
          }
        });

        // Grant features
        if (itm.itemType === "service" || itm.itemType === "product") {
          await createSyncedTreatment(itm.itemId, itemPrice, itemQty, itemDiscount, itm.useToday, itm.technicianId);
        } else if (itm.itemType === "card") {
          await createSyncedCard(itm.itemId);
        }
      }

      // 5. Process UPDATED items
      for (const itm of updatedItems) {
        const oldItm = existingItems.find((x) => x.id === itm.id)!;
        const itemPrice = Number(itm.price || 0);
        const itemQty = Number(itm.quantity || 1);
        const itemDiscount = Number(itm.discount || 0);

        // Scenario 5.1: Changed itemId (equivalent to delete old and create new)
        if (itm.itemId !== oldItm.itemId || itm.itemType !== oldItm.itemType) {
          // Delete old features
          if (oldItm.itemType === "service" || oldItm.itemType === "product") {
            await deleteSyncedTreatment(oldItm.itemId);
          } else if (oldItm.itemType === "card") {
            await deleteSyncedCard(oldItm.itemId);
          }

          // Create new features
          if (itm.itemType === "service" || itm.itemType === "product") {
            await createSyncedTreatment(itm.itemId, itemPrice, itemQty, itemDiscount, itm.useToday, itm.technicianId);
          } else if (itm.itemType === "card") {
            await createSyncedCard(itm.itemId);
          }
        } 
        // Scenario 5.2: Same itemId or changed price/quantity/discount/useToday/technicianId
        else {
          if (itm.itemType === "service" || itm.itemType === "product") {
            // Find and update synced customer treatment
            const treatment = await tx.customerTreatment.findFirst({
              where: {
                customerId: invoice.customerId,
                serviceId: itm.itemId,
                createdAt: { gte: dateMin, lte: dateMax }
              }
            });
            if (treatment) {
              const service = await tx.service.findUnique({
                where: { id: itm.itemId },
                select: { tags: true }
              });
              const sessions = service?.tags && typeof service.tags === "object" && service.tags !== null && "sessions" in service.tags ? Number((service.tags as any).sessions) : 1;
              const totalSessions = itemQty * sessions;

              await tx.customerTreatment.update({
                where: { id: treatment.id },
                data: {
                  totalSessions,
                  pricePaid: Math.max((itemPrice * itemQty) - itemDiscount, 0),
                  usedSessions: itm.useToday ? 1 : 0,
                }
              });

              // Handle immediate service usage (UsageLog)
              const existingLog = await tx.usageLog.findFirst({
                where: { treatmentId: treatment.id }
              });

              if (itm.useToday) {
                const tech = await tx.staff.findUnique({
                  where: { id: itm.technicianId },
                  select: { fullName: true }
                });
                const technicianName = tech?.fullName || "Nhân viên";

                if (existingLog) {
                  await tx.usageLog.update({
                    where: { id: existingLog.id },
                    data: {
                      performedBy: technicianName,
                      staffId: itm.technicianId,
                    }
                  });
                } else {
                  await tx.usageLog.create({
                    data: {
                      customerId: invoice.customerId,
                      serviceId: itm.itemId,
                      sourceType: "treatment",
                      treatmentId: treatment.id,
                      sessionsDeducted: 1,
                      performedBy: technicianName,
                      staffId: itm.technicianId,
                      usedAt: invoice.createdAt,
                      notes: "Sử dụng ngay khi lập hóa đơn (Cập nhật)",
                    }
                  });
                }
              } else {
                if (existingLog) {
                  await tx.usageLog.delete({
                    where: { id: existingLog.id }
                  });
                }
              }
            }
          } else if (itm.itemType === "card") {
            // Find and update synced customer card
            const card = await tx.customerCard.findFirst({
              where: {
                customerId: invoice.customerId,
                templateId: itm.itemId,
                createdAt: { gte: dateMin, lte: dateMax }
              }
            });
            if (card) {
              await tx.customerCard.update({
                where: { id: card.id },
                data: {
                  originalPrice: itemPrice,
                }
              });
            }
          }
        }

        // Update the invoice item record
        await tx.invoiceItem.update({
          where: { id: itm.id },
          data: {
            itemType: itm.itemType,
            itemId: itm.itemId,
            price: itemPrice,
            quantity: itemQty,
            discount: itemDiscount,
            staffId: itm.staffId || null,
            saleStaffIds: itm.saleStaffIds || [],
          }
        });
      }

      // 6. Recalculate invoice finances
      const allUpdatedItems = await tx.invoiceItem.findMany({
        where: { invoiceId: id }
      });

      const newRawTotal = allUpdatedItems.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0);
      const itemsTotalDiscount = allUpdatedItems.reduce((sum, i) => sum + Number(i.discount), 0);
      const invoiceDisc = Number(discount);
      const newFinalAmount = Math.max(newRawTotal - itemsTotalDiscount - invoiceDisc, 0);

      const paidOffset = paidAmountOffset !== undefined ? Number(paidAmountOffset) : Number(invoice.paidAmountOffset || 0);

      let paidCash = Number(paidAmountCash || 0);
      let paidTransfer = Number(paidAmountTransfer || 0);
      let paidHomeCredit = Number(paidAmountHomeCredit || 0);
      let paidMiraeAsset = Number(paidAmountMiraeAsset || 0);
      let paidDebt = Number(paidAmountDebt || 0);

      const sumSplit = paidCash + paidTransfer + paidHomeCredit + paidMiraeAsset + paidDebt + paidOffset;
      if (sumSplit === 0) {
        if (paymentType === "cash") {
          paidCash = newFinalAmount;
        } else {
          const downPaymentNum = Number(downPayment || 0);
          paidCash = downPaymentNum;
          const remaining = newFinalAmount - downPaymentNum;
          if (installmentType === "home_credit") {
            paidHomeCredit = remaining;
          } else if (installmentType === "mirae_asset") {
            paidMiraeAsset = remaining;
          } else {
            paidDebt = remaining;
          }
        }
      }

      const calculatedPaymentType = (paidDebt > 0 || paidHomeCredit > 0 || paidMiraeAsset > 0) ? "installment" : "cash";
      const calculatedInstallmentType = paidDebt > 0 ? "counter" : (paidHomeCredit > 0 ? "home_credit" : (paidMiraeAsset > 0 ? "mirae_asset" : null));

      // 7. Update Customer spent integration
      const oldInvoiceNetSpent = Number(invoice.finalAmount) - Number(invoice.paidAmountOffset);
      const newInvoiceNetSpent = newFinalAmount - paidOffset;
      const diffSpent = newInvoiceNetSpent - oldInvoiceNetSpent;
      
      const newTotalSpent = Math.max(0, Number(customer.totalSpent) + diffSpent);
      const newTier = calculateTier(newTotalSpent);

      const [updated] = await Promise.all([
        tx.invoice.update({
          where: { id },
          data: {
            staff: { connect: { id: staffId } },
            totalAmount: newRawTotal,
            discount: invoiceDisc,
            finalAmount: newFinalAmount,
            paymentType: calculatedPaymentType,
            installmentType: calculatedInstallmentType,
            installmentMonths: (paidDebt > 0 || paidHomeCredit > 0 || paidMiraeAsset > 0) ? Number(installmentMonths) : null,
            bankFee: Number(bankFee),
            paidAmountCash: paidCash,
            paidAmountTransfer: paidTransfer,
            paidAmountHomeCredit: paidHomeCredit,
            paidAmountMiraeAsset: paidMiraeAsset,
            paidAmountDebt: paidDebt,
            paidAmountOffset: paidOffset,
            internalNotes: internalNotes || null,
          },
        }),
        tx.customer.update({
          where: { id: customer.id },
          data: { totalSpent: newTotalSpent, tier: newTier },
        }),
        tx.installmentSchedule.deleteMany({
          where: { invoiceId: id },
        }),
      ]);

      // 8. Recreate installment schedules
      if (paidDebt > 0) {
        const months = Number(installmentMonths || 1);
        const debtAmount = paidDebt;
        const baseMonthlyAmount = Math.floor(debtAmount / months);
        let sumCreated = 0;
        
        const scheduleData = [];
        for (let i = 1; i <= months; i++) {
          let monthlyAmount = baseMonthlyAmount;
          if (i === months) {
            monthlyAmount = debtAmount - sumCreated;
          } else {
            sumCreated += baseMonthlyAmount;
          }
          
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (30 * i));
          
          scheduleData.push({
            invoiceId: id,
            dueDate,
            amount: monthlyAmount,
            status: "pending",
          });
        }
        
        await tx.installmentSchedule.createMany({ data: scheduleData });
      }

      return updated;
    });
    
    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (error: any) {
    console.error("PUT Invoice Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi sửa hóa đơn" }, { status: 500 });
  }
}

// DELETE to void/cancel an invoice
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const deletedInvoice = await db.$transaction(async (tx) => {
      // 1. Fetch invoice to get finalAmount and customerId
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true },
      });
      
      if (!invoice) {
        throw new Error("Không tìm thấy hóa đơn cần xóa");
      }
      
      // 2. Find customer
      const customer = await tx.customer.findUnique({
        where: { id: invoice.customerId },
      });
      if (!customer) throw new Error("Khách hàng không tồn tại");
      
      // 3. Revert customer spent and tier
      const newTotalSpent = Math.max(0, Number(customer.totalSpent) - (Number(invoice.finalAmount) - Number(invoice.paidAmountOffset)));
      const newTier = calculateTier(newTotalSpent);
      
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalSpent: newTotalSpent,
          tier: newTier,
        },
      });
      
      // 4. Revert cards and treatments generated by this invoice
      const dateMin = new Date(invoice.createdAt.getTime() - 10000);
      const dateMax = new Date(invoice.createdAt.getTime() + 10000);
      
      for (const item of invoice.items) {
        if (item.itemType === "card") {
          // Find customer cards created by this invoice to delete their usage logs first
          const cards = await tx.customerCard.findMany({
            where: {
              customerId: invoice.customerId,
              templateId: item.itemId,
              createdAt: {
                gte: dateMin,
                lte: dateMax,
              },
            },
            select: { id: true }
          });
          
          if (cards.length > 0) {
            const cardIds = cards.map(c => c.id);
            // Delete usage logs associated with these cards
            await tx.usageLog.deleteMany({
              where: { cardId: { in: cardIds } }
            });
            // Delete the cards
            await tx.customerCard.deleteMany({
              where: { id: { in: cardIds } }
            });
          }
        } else if (item.itemType === "service") {
          // Find customer treatments created by this invoice to delete their usage logs first
          const treatments = await tx.customerTreatment.findMany({
            where: {
              customerId: invoice.customerId,
              serviceId: item.itemId,
              createdAt: {
                gte: dateMin,
                lte: dateMax,
              },
            },
            select: { id: true }
          });
          
          if (treatments.length > 0) {
            const treatmentIds = treatments.map(t => t.id);
            // Delete usage logs associated with these treatments
            await tx.usageLog.deleteMany({
              where: { treatmentId: { in: treatmentIds } }
            });
            // Delete the treatments
            await tx.customerTreatment.deleteMany({
              where: { id: { in: treatmentIds } }
            });
          }
        }
      }
      
      // 5. Delete invoice (cascade handles InvoiceItem and InstallmentSchedule deletion)
      const deleted = await tx.invoice.delete({
        where: { id },
      });
      
      return deleted;
    });
    
    return NextResponse.json({ success: true, invoice: deletedInvoice });
  } catch (error: any) {
    console.error("DELETE Invoice Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi xóa hóa đơn" }, { status: 500 });
  }
}
