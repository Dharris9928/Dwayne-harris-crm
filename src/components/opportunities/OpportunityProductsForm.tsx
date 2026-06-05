import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { PRODUCT_CATALOG, getUnitPrice, getVolumeTier } from "@/lib/products/productCatalog";
import { useMemo } from "react";

type OpportunityProduct = {
  product_name: string;
  quantity: number;
  unit_price: number;
};

interface OpportunityProductsFormProps {
  products: OpportunityProduct[];
  setProducts: (products: OpportunityProduct[]) => void;
}

export function OpportunityProductsForm({ products, setProducts }: OpportunityProductsFormProps) {
  const addProduct = () => {
    setProducts([
      ...products,
      { product_name: PRODUCT_CATALOG[0].name, quantity: 50, unit_price: PRODUCT_CATALOG[0].pricingTiers[0].usPrice },
    ]);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof OpportunityProduct, value: any) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };

    if (field === "product_name" || field === "quantity") {
      const productName = field === "product_name" ? value : newProducts[index].product_name;
      const quantity = field === "quantity" ? (parseInt(value) || 50) : newProducts[index].quantity;
      newProducts[index].unit_price = getUnitPrice(productName, quantity);
    }

    setProducts(newProducts);
  };

  const grandTotal = useMemo(
    () => products.reduce((sum, p) => sum + p.quantity * p.unit_price, 0),
    [products]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Products</Label>
        <Button type="button" variant="outline" size="sm" onClick={addProduct}>
          <Plus className="h-4 w-4 mr-1" />
          Add Product
        </Button>
      </div>

      {products.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No products added yet. Click "Add Product" to get started.
        </p>
      )}

      {products.map((product, index) => (
        <Card key={index} className="p-4">
          <div className="flex gap-3 items-start">
            <div className="flex-1 grid grid-cols-4 gap-3">
              <div className="col-span-2 space-y-2">
                <Label className="text-xs">Product</Label>
                <Select
                  value={product.product_name}
                  onValueChange={(value) => updateProduct(index, "product_name", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATALOG.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={product.quantity}
                  onChange={(e) =>
                    updateProduct(index, "quantity", parseInt(e.target.value) || 1)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Tier: {getVolumeTier(product.quantity)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Unit Price</Label>
                <p className="text-sm font-medium pt-2">{formatCurrency(product.unit_price)}</p>
                <p className="text-xs text-muted-foreground">
                  Line: {formatCurrency(product.quantity * product.unit_price)}
                </p>
              </div>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProduct(index)}
                    className="mt-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove product</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Card>
      ))}

      {products.length > 0 && (
        <div className="flex justify-end pt-2">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Grand Total</p>
            <p className="text-xl font-bold">{formatCurrency(grandTotal)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
