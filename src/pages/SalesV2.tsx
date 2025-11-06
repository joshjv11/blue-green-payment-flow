import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
}

export default function SalesV2() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useBusinessSettings();
  
  const [loading, setLoading] = useState(false);
  
  // Customer fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerPostalCode, setCustomerPostalCode] = useState("");
  const [customerCountry, setCustomerCountry] = useState("India");
  const [customerGstin, setCustomerGstin] = useState("");
  
  // Order fields
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`);
  const [notes, setNotes] = useState("");
  
  // Line items
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, discount: 0, tax_rate: 18 }
  ]);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, discount: 0, tax_rate: 18 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      toast({
        title: "Customer name required",
        description: "Please enter a customer name",
        variant: "destructive",
      });
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast({
        title: "Item description required",
        description: "All items must have a description",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("create-sale-v2", {
        body: {
          customer: {
            name: customerName,
            email: customerEmail || undefined,
            phone: customerPhone || undefined,
            address: customerAddress || undefined,
            city: customerCity || undefined,
            state: customerState || undefined,
            postal_code: customerPostalCode || undefined,
            country: customerCountry || "India",
            gstin: customerGstin || undefined,
          },
          items: items.map(item => ({
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            discount: Number(item.discount) || 0,
            tax_rate: Number(item.tax_rate),
          })),
          order_date: orderDate,
          invoice_number: invoiceNumber,
          notes: notes || undefined,
          seller_state: settings.country === "IN" ? customerState : undefined,
        },
      });

      if (error) {
        console.error("Error invoking function:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to create sale. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if response explicitly indicates an error
      if (data && data.ok === false) {
        console.error("Sale creation failed:", data);
        const errorMsg = data.message || "Failed to create sale";
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

      // Track sales creation
      const { trackFeatureUsage } = await import('@/lib/analytics');
      trackFeatureUsage('Sales', 'create', { 
        invoice_number: data?.data?.invoice_number || invoiceNumber,
        amount: data?.data?.grand_total 
      });
      
      toast({
        title: "Success",
        description: `Sale created! Invoice: ${data?.data?.invoice_number || invoiceNumber}`,
      });

      navigate("/sales");
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create Sale (V2)</h1>
            <p className="text-muted-foreground">Server-side validated sales order</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/sales")}>
            Back to Sales
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Enter customer details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerGstin">GSTIN</Label>
                  <Input
                    id="customerGstin"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerAddress">Address</Label>
                <Input
                  id="customerAddress"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerCity">City</Label>
                  <Input
                    id="customerCity"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerState">State</Label>
                  <Input
                    id="customerState"
                    value={customerState}
                    onChange={(e) => setCustomerState(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPostalCode">Postal Code</Label>
                  <Input
                    id="customerPostalCode"
                    value={customerPostalCode}
                    onChange={(e) => setCustomerPostalCode(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerCountry">Country</Label>
                <Input
                  id="customerCountry"
                  value={customerCountry}
                  onChange={(e) => setCustomerCountry(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>Add products or services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-2 lg:col-span-2">
                      <Label>Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(index, "tax_rate", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button type="button" variant="outline" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate("/sales")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Sale
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
