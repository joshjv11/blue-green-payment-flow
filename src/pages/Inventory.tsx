import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Package, AlertTriangle, DollarSign, Edit2, Trash2, ShoppingCart, ShoppingBag, ChevronDown, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/PageTransition";
import { Breadcrumb } from "@/components/Breadcrumb";

interface Product {
  id: string;
  name: string;
  sku: string;
  purchase_price: number;
  selling_price: number;
  stock_qty: number;
  reorder_level: number;
  created_at: string;
}

export default function Inventory() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    purchase_price: "",
    selling_price: "",
    stock_qty: "",
    reorder_level: "10",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const productData = {
        user_id: user.id,
        name: formData.name,
        sku: formData.sku,
        purchase_price: parseFloat(formData.purchase_price),
        selling_price: parseFloat(formData.selling_price),
        stock_qty: parseInt(formData.stock_qty),
        reorder_level: parseInt(formData.reorder_level),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase.from("products").insert([productData]);
        if (error) throw error;
        toast({ title: "Product added successfully" });
      }

      setDialogOpen(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        sku: "",
        purchase_price: "",
        selling_price: "",
        stock_qty: "",
        reorder_level: "10",
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      purchase_price: product.purchase_price.toString(),
      selling_price: product.selling_price.toString(),
      stock_qty: product.stock_qty.toString(),
      reorder_level: product.reorder_level.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Product deleted successfully" });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock_qty <= p.reorder_level).length;
  const inventoryValue = products.reduce((sum, p) => sum + (p.stock_qty * p.purchase_price), 0);

  return (
    <PageTransition>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Inventory" },
          ]}
        />

        {/* Header with Quick Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>

          <div className="flex gap-2">
            {/* Quick Navigation Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Quick Actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/sales")}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  View Sales Invoices
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/purchases")}>
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  View Purchase Invoices
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingProduct(null);
                setFormData({
                  name: "",
                  sku: "",
                  purchase_price: "",
                  selling_price: "",
                  stock_qty: "",
                  reorder_level: "10",
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Product Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>SKU Code</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Purchase Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Selling Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.selling_price}
                        onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Current Stock</Label>
                      <Input
                        type="number"
                        value={formData.stock_qty}
                        onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Reorder Level</Label>
                      <Input
                        type="number"
                        value={formData.reorder_level}
                        onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingProduct ? "Update Product" : "Add Product"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <Card className="p-8 text-center border-dashed">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <CardHeader>
              <CardTitle>No products yet</CardTitle>
              <CardDescription>
                Start by adding a product or recording a purchase invoice to track your inventory
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
              <Button variant="outline" onClick={() => navigate("/purchases")}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                Create Purchase Invoice
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-3xl font-bold mt-2">{totalProducts}</p>
              </div>
              <Package className="h-12 w-12 text-primary opacity-20" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-3xl font-bold mt-2 text-destructive">{lowStockItems}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-destructive opacity-20" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-3xl font-bold mt-2">₹{inventoryValue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-12 w-12 text-primary opacity-20" />
            </div>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4">Product Name</th>
                  <th className="text-left p-4">SKU</th>
                  <th className="text-right p-4">Stock Qty</th>
                  <th className="text-right p-4">Purchase Price</th>
                  <th className="text-right p-4">Selling Price</th>
                  <th className="text-right p-4">Stock Value</th>
                  <th className="text-center p-4">Status</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-muted-foreground">
                      Loading products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-muted-foreground">
                      No products found. Add your first product to get started.
                    </td>
                  </tr>
                ) : (
                  products.map((product, index) => (
                    <tr key={product.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="p-4 font-medium">{product.name}</td>
                      <td className="p-4 text-muted-foreground">{product.sku}</td>
                      <td className="p-4 text-right">{product.stock_qty}</td>
                      <td className="p-4 text-right">₹{product.purchase_price.toFixed(2)}</td>
                      <td className="p-4 text-right">₹{product.selling_price.toFixed(2)}</td>
                      <td className="p-4 text-right font-medium">
                        ₹{(product.stock_qty * product.purchase_price).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        {product.stock_qty <= product.reorder_level ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="default">In Stock</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
