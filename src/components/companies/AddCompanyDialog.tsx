import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const builderSegments = [
  "Production/Tract Builders",
  "Regional Mid-Volume Builders",
  "Spec Home Builders",
  "Luxury Custom Builders",
  "Multi-Family Developers",
  "Affordable Housing Builders",
  "Active Adult/55+ Specialists",
];

const contractorSegments = [
  "Smart Home Champions",
  "Customer Experience Innovators",
  "High-Volume Installers",
  "Premium Service Specialists",
  "Regional Growth Contractors",
  "Specialty HVAC Integrators",
  "Service-First Traditionalists",
  "Emergency/Repair Specialists",
];

export function AddCompanyDialog({ open, onOpenChange, onSuccess }: AddCompanyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    industry_type: "Builder" as "Builder" | "Contractor",
    segment: "",
    website_url: "",
    primary_phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const companyData: any = {
        company_name: formData.company_name,
        industry_type: formData.industry_type,
        website_url: formData.website_url || null,
        primary_phone: formData.primary_phone || null,
        created_by: user.id,
      };

      if (formData.industry_type === "Builder") {
        companyData.builder_segment = formData.segment;
      } else {
        companyData.contractor_segment = formData.segment;
      }

      const { error } = await supabase.from("companies").insert([companyData]);

      if (error) throw error;

      toast.success("Company added successfully!");
      setFormData({
        company_name: "",
        industry_type: "Builder",
        segment: "",
        website_url: "",
        primary_phone: "",
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to add company");
    } finally {
      setLoading(false);
    }
  };

  const segments = formData.industry_type === "Builder" ? builderSegments : contractorSegments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Enter the company details to add them to your CRM.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry_type">Industry Type *</Label>
              <Select
                value={formData.industry_type}
                onValueChange={(value: "Builder" | "Contractor") =>
                  setFormData({ ...formData, industry_type: value, segment: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Builder">Builder</SelectItem>
                  <SelectItem value="Contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="segment">Segment *</Label>
              <Select value={formData.segment} onValueChange={(value) => setFormData({ ...formData, segment: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a segment" />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((segment) => (
                    <SelectItem key={segment} value={segment}>
                      {segment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                type="url"
                placeholder="https://example.com"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="primary_phone">Phone Number</Label>
              <Input
                id="primary_phone"
                type="tel"
                value={formData.primary_phone}
                onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
