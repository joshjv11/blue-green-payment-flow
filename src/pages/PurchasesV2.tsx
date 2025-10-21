import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

export default function PurchasesV2() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierCity, setSupplierCity] = useState("");
  const [supplierState, setSupplierState] = useState("");
  const [supplierPostalCode, setSupplierPostalCode] = useState("");
  const [supplierCountry, setSupplierCountry] = useState("India");
  const [supplierGstin, setSupplierGstin] = useState("");
  
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [sellerState, setSellerState] = useState("");
  
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("0");
  const [itemDiscount, setItemDiscount] = useState("0");
  const [itemTaxRate, setItemTaxRate] = useState("18");
  
  const [items, setItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  const addItem = () => {
    if (!itemDescription || !itemQuantity || !itemUnitPrice) {
      toast({
        title: "Missing item details",
        description: "Please fill in all item fields",
        variant: "destructive",
      });
      return;
    }

    setItems([
      ...items,
      {
        description: itemDescription,
        quantity: parseFloat(itemQuantity),
        unit_price: parseFloat(itemUnitPrice),
        discount: parseFloat(itemDiscount) || 0,
        tax_rate: parseFloat(itemTaxRate),
      },
    ]);

    // Reset item fields
    setItemDescription("");
    setItemQuantity("1");
    setItemUnitPrice("0");
    setItemDiscount("0");
    setItemTaxRate("18");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!supplierName) {
      toast({
        title: "Missing supplier",
        description: "Please enter supplier name",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "No items",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setDryRunResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("create-purchase-v2", {
        body: {
          supplier: {
            name: supplierName,
            email: supplierEmail || undefined,
            phone: supplierPhone || undefined,
            address: supplierAddress || undefined,
            city: supplierCity || undefined,
            state: supplierState || undefined,
            postal_code: supplierPostalCode || undefined,
            country: supplierCountry,
            gstin: supplierGstin || undefined,
          },
          items,
          order_date: orderDate,
          invoice_number: invoiceNumber,
          notes: notes || undefined,
          seller_state: sellerState || undefined,
          dry_run: dryRun,
        },
      });

      if (error) {
        console.error("Error invoking function:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to create purchase. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if response indicates an error
      if (data && !data.ok) {
        console.error("Purchase creation failed:", data);
        const errorMsg = data.message || "Failed to create purchase";
        const detailsMsg = data.details ? ` (${data.details})` : '';
        const hintMsg = data.hint ? ` Hint: ${data.hint}` : '';
        const codeMsg = data.code ? ` Code: ${data.code}` : '';
        toast({
          title: `Error at ${data.stage || 'unknown stage'}`,
          description: `${errorMsg}${detailsMsg}${hintMsg}${codeMsg}`,
          variant: "destructive",
        });
        return;
      }

      // If dry run, show computed totals
      if (data?.dry_run) {
        setDryRunResult(data.totals);
        toast({
          title: "Dry Run Complete",
          description: "Check computed totals below. Toggle off Dry Run to save.",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Purchase created! Invoice: ${data?.data?.invoice_number || invoiceNumber}`,
      });

      navigate("/purchases");
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Purchase Order (V2)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Supplier Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Supplier Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplierName">Supplier Name *</Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="supplierEmail">Email</Label>
                <Input
                  id="supplierEmail"
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="supplierPhone">Phone</Label>
                <Input
                  id="supplierPhone"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="supplierGstin">GSTIN</Label>
                <Input
                  id="supplierGstin"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="supplierAddress">Address</Label>
                <Input
                  id="supplierAddress"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="supplierCity">City</Label>
                <Input
                  id="supplierCity"
                  value={supplierCity}
                  onChange={(e) => setSupplierCity(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="supplierState">State</Label>
                <Input
                  id="supplierState"
                  value={supplierState}
                  onChange={(e) => setSupplierState(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="supplierPostalCode">Postal Code</Label>
                <Input
                  id="supplierPostalCode"
                  value={supplierPostalCode}
                  onChange={(e) => setSupplierPostalCode(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="supplierCountry">Country</Label>
                <Input
                  id="supplierCountry"
                  value={supplierCountry}
                  onChange={(e) => setSupplierCountry(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sellerState">Your State (for GST)</Label>
                <Input
                  id="sellerState"
                  value={sellerState}
                  onChange={(e) => setSellerState(e.target.value)}
                  placeholder="e.g., Maharashtra"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Add Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Line Items</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="itemDescription">Description</Label>
                <Input
                  id="itemDescription"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="itemQuantity">Quantity</Label>
                <Input
                  id="itemQuantity"
                  type="number"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="itemUnitPrice">Unit Price</Label>
                <Input
                  id="itemUnitPrice"
                  type="number"
                  value={itemUnitPrice}
                  onChange={(e) => setItemUnitPrice(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="itemDiscount">Discount</Label>
                <Input
                  id="itemDiscount"
                  type="number"
                  value={itemDiscount}
                  onChange={(e) => setItemDiscount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="itemTaxRate">Tax Rate %</Label>
                <Input
                  id="itemTaxRate"
                  type="number"
                  value={itemTaxRate}
                  onChange={(e) => setItemTaxRate(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={addItem} type="button">
              Add Item
            </Button>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Items Added:</h4>
              {items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <span>
                    {item.description} - Qty: {item.quantity} × ₹{item.unit_price}
                    {item.discount > 0 && ` - Disc: ₹${item.discount}`} @ {item.tax_rate}% tax
                  </span>
                  <Button variant="destructive" size="sm" onClick={() => removeItem(index)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Dry Run Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="dryRun"
              checked={dryRun}
              onCheckedChange={setDryRun}
            />
            <Label htmlFor="dryRun">Dry Run (show totals without saving)</Label>
          </div>

          {/* Dry Run Result */}
          {dryRunResult && (
            <Card>
              <CardHeader>
                <CardTitle>Computed Totals (Dry Run)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>Subtotal: ₹{dryRunResult.subtotal?.toFixed(2)}</p>
                  {dryRunResult.isIndia && dryRunResult.isIntraState && (
                    <>
                      <p>CGST: ₹{dryRunResult.cgst_amount?.toFixed(2)}</p>
                      <p>SGST: ₹{dryRunResult.sgst_amount?.toFixed(2)}</p>
                    </>
                  )}
                  {dryRunResult.isIndia && !dryRunResult.isIntraState && (
                    <p>IGST: ₹{dryRunResult.igst_amount?.toFixed(2)}</p>
                  )}
                  {!dryRunResult.isIndia && (
                    <p>Tax: ₹{dryRunResult.tax_amount?.toFixed(2)}</p>
                  )}
                  <p className="font-bold">Grand Total: ₹{dryRunResult.grand_total?.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {dryRun ? "Calculate Totals" : "Create Purchase"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/purchases")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
