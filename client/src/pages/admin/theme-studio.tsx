import React, { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useTheme } from "@/theme";
import { THEME_PRESETS, DEFAULT_PRESET, type ThemePreset, type ThemeTokenOverrides } from "@/theme";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Palette, 
  RotateCcw, 
  Save, 
  Download, 
  Sliders, 
  Eye, 
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminThemeStudio() {
  const { activeOverrides, applyTheme, resetTheme, saveTheme, isSaving, isDirty } = useTheme();
  const { toast } = useToast();
  const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);

  // Custom editor form state derived from activeOverrides or defaults
  const [customConfig, setCustomConfig] = useState<ThemeTokenOverrides>(() => {
    return activeOverrides || DEFAULT_PRESET.tokenOverrides;
  });

  const handleSelectPreset = (preset: ThemePreset) => {
    setSelectedPresetName(preset.name);
    setCustomConfig(preset.tokenOverrides);
    applyTheme(preset.tokenOverrides);
    toast({
      title: `Applied preset: ${preset.name}`,
      description: "Live preview updated across the application.",
    });
  };

  const handleCustomChange = (fieldPath: string, value: string) => {
    const nextConfig = JSON.parse(JSON.stringify(customConfig)) as ThemeTokenOverrides;
    
    if (fieldPath === "primary.main") {
      if (!nextConfig.primary) nextConfig.primary = { main: value };
      else nextConfig.primary.main = value;
    } else if (fieldPath === "secondary.main") {
      if (!nextConfig.secondary) nextConfig.secondary = { main: value };
      else nextConfig.secondary.main = value;
    } else if (fieldPath === "background.default") {
      if (!nextConfig.background) nextConfig.background = {};
      nextConfig.background.default = value;
    } else if (fieldPath === "background.paper") {
      if (!nextConfig.background) nextConfig.background = {};
      nextConfig.background.paper = value;
    } else if (fieldPath === "border.radius") {
      if (!nextConfig.border) nextConfig.border = {};
      nextConfig.border.radius = value;
    } else if (fieldPath === "typography.fontFamilyDisplay") {
      if (!nextConfig.typography) nextConfig.typography = {};
      nextConfig.typography.fontFamilyDisplay = value;
    } else if (fieldPath === "typography.fontFamilyBody") {
      if (!nextConfig.typography) nextConfig.typography = {};
      nextConfig.typography.fontFamilyBody = value;
    }

    setCustomConfig(nextConfig);
    applyTheme(nextConfig);
    setSelectedPresetName(null);
  };

  const handleSave = async () => {
    try {
      await saveTheme(activeOverrides || customConfig);
      toast({
        title: "Theme saved successfully!",
        description: "All users under your tenant will see this token theme.",
      });
    } catch (err) {
      toast({
        title: "Failed to save theme",
        description: "Please check your network and try again.",
        variant: "destructive",
      });
    }
  };

  const handleReset = async () => {
    resetTheme();
    setSelectedPresetName(DEFAULT_PRESET.name);
    setCustomConfig(DEFAULT_PRESET.tokenOverrides);
    await saveTheme(null);
    toast({
      title: "Theme reset to default",
      description: "Restored Paper & Teal default theme.",
    });
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(activeOverrides || customConfig, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tenant-theme-tokens.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Theme exported as JSON" });
  };

  return (
    <DashboardLayout>
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/80 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Theme Studio</h1>
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Sparkles className="w-3 h-3" /> Token-Based
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Define multi-tenant design tokens. Changes update CSS variables live across the system.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-2">
            <Download className="w-4 h-4" /> Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2 text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-4 h-4" /> Reset Default
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={isSaving || !isDirty}
            className="gap-2 bg-primary text-primary-foreground shadow-md hover:opacity-90"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : isDirty ? "Save Theme *" : "Saved"}
          </Button>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="gallery" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="gallery" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Palette className="w-4 h-4" /> Preset Gallery (21)
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Sliders className="w-4 h-4" /> Token Editor
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: 20 Presets Gallery */}
        <TabsContent value="gallery" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[DEFAULT_PRESET, ...THEME_PRESETS].map((preset, idx) => {
              const isSelected = selectedPresetName === preset.name;
              const pColor = preset.tokenOverrides.primary?.main || "#0F766E";
              const sColor = preset.tokenOverrides.secondary?.main || "#5B7C8D";
              const bgColor = preset.tokenOverrides.background?.default || "#F4F8F9";
              const pLight = preset.tokenOverrides.primary?.subtle || "#EEF0FE";
              const fontFamily = preset.tokenOverrides.typography?.fontFamilyDisplay || "Inter";
              const radius = preset.tokenOverrides.border?.radius || "0.5rem";
              const displayIdx = preset.name === DEFAULT_PRESET.name ? 0 : idx;

              return (
                <motion.div
                  key={preset.name}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card
                    onClick={() => handleSelectPreset(preset)}
                    className={`cursor-pointer transition-all duration-200 overflow-hidden border-2 hover:shadow-lg ${
                      isSelected 
                        ? "border-primary ring-2 ring-primary/20 shadow-md" 
                        : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <CardHeader className="p-4 pb-3 flex flex-row items-start justify-between space-y-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                            {displayIdx}
                          </span>
                          <CardTitle className="text-base font-bold">{preset.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs mt-0.5">{preset.tag}</CardDescription>
                      </div>
                      {isSelected && (
                        <span className="p-1 rounded-full bg-primary text-primary-foreground">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      )}
                    </CardHeader>

                    {/* Mini Dashboard Preview Screen — Untitled-4 rail layout */}
                    <CardContent className="p-3 pt-0">
                      <div
                        className="overflow-hidden border text-xs shadow-inner"
                        style={{
                          backgroundColor: bgColor,
                          borderRadius: radius,
                          fontFamily: `'${fontFamily}', sans-serif`,
                          borderColor: preset.tokenOverrides.border?.default || "#E5E7EB",
                        }}
                      >
                        <div className="flex h-[200px]">
                          {/* Icon rail */}
                          <div
                            className="flex w-[42px] shrink-0 flex-col items-center gap-1.5 border-r py-2"
                            style={{
                              backgroundColor: preset.tokenOverrides.background?.paper || "#fff",
                              borderColor: preset.tokenOverrides.border?.default || "#E5E7EB",
                            }}
                          >
                            <div
                              className="mb-0.5 flex h-5 w-5 items-center justify-center rounded-md text-white"
                              style={{ backgroundColor: pColor }}
                            >
                              <span className="text-[8px]">📚</span>
                            </div>
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="flex h-6 w-6 items-center justify-center rounded-[7px]"
                                style={
                                  i === 0
                                    ? { backgroundColor: pLight, color: pColor }
                                    : { color: preset.tokenOverrides.text?.muted || "#6B7280" }
                                }
                              >
                                <span className="text-[9px] opacity-70">●</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col">
                            <div
                              className="flex h-8 shrink-0 items-center justify-between border-b px-2"
                              style={{
                                backgroundColor: preset.tokenOverrides.background?.paper || "#fff",
                                borderColor: preset.tokenOverrides.border?.default || "#E5E7EB",
                              }}
                            >
                              <span className="text-[10px] font-bold" style={{ color: pColor }}>
                                Edu Transform
                              </span>
                              <div className="flex items-center gap-1">
                                <span
                                  className="rounded-full border px-1.5 py-0.5 text-[7px]"
                                  style={{
                                    borderColor: preset.tokenOverrides.border?.default,
                                    color: preset.tokenOverrides.text?.muted,
                                  }}
                                >
                                  Search
                                </span>
                                <span
                                  className="flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white"
                                  style={{ backgroundColor: pColor }}
                                >
                                  A
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-1 flex-col gap-1.5 p-2">
                              <div
                                className="text-[8px]"
                                style={{ color: preset.tokenOverrides.text?.muted }}
                              >
                                Welcome back, Aman
                              </div>
                              <div className="grid grid-cols-4 gap-1">
                                {["12", "78%", "24", "15"].map((n, i) => (
                                  <div
                                    key={i}
                                    className="flex flex-col gap-0.5 p-1"
                                    style={{
                                      backgroundColor: pLight,
                                      borderRadius: `calc(${radius} - 4px)`,
                                    }}
                                  >
                                    <div
                                      className="flex h-3 w-3 items-center justify-center rounded-[3px] bg-white"
                                      style={{ color: pColor }}
                                    >
                                      <span className="text-[6px]">◆</span>
                                    </div>
                                    <span className="text-[9px] font-bold" style={{ color: preset.tokenOverrides.text?.primary }}>
                                      {n}
                                    </span>
                                    <span className="text-[6px]" style={{ color: preset.tokenOverrides.text?.muted }}>
                                      {["Courses", "Done", "Certs", "Users"][i]}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-0.5 space-y-1">
                                <div className="text-[8px] font-bold" style={{ color: preset.tokenOverrides.text?.primary }}>
                                  Course Progress
                                </div>
                                {[82, 65, 45].map((pct, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <span className="w-12 truncate text-[7px]" style={{ color: preset.tokenOverrides.text?.primary }}>
                                      {["React", "SQL", "UI/UX"][i]}
                                    </span>
                                    <div
                                      className="h-1 flex-1 overflow-hidden rounded-full"
                                      style={{ backgroundColor: preset.tokenOverrides.border?.default }}
                                    >
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pColor }} />
                                    </div>
                                    <span className="w-5 text-right text-[7px]" style={{ color: preset.tokenOverrides.text?.muted }}>
                                      {pct}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    {/* Color Swatches */}
                    <CardFooter className="p-3 bg-muted/30 border-t flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-md border border-black/10" style={{ backgroundColor: pColor }} title="Primary" />
                        <span className="w-4 h-4 rounded-md border border-black/10" style={{ backgroundColor: sColor }} title="Secondary" />
                        <span className="w-4 h-4 rounded-md border border-black/10" style={{ backgroundColor: bgColor }} title="Background" />
                        <span className="w-4 h-4 rounded-md border border-black/10" style={{ backgroundColor: pLight }} title="Subtle" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground">{fontFamily}</span>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 2: Custom Token Editor */}
        <TabsContent value="custom" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-6 p-6 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" /> Token Controls
              </h3>

              {/* Primary Color */}
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="primary-color"
                    type="color"
                    value={customConfig.primary?.main || "#0F766E"}
                    onChange={(e) => handleCustomChange("primary.main", e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-input p-0.5"
                  />
                  <Input
                    type="text"
                    value={customConfig.primary?.main || "#0F766E"}
                    onChange={(e) => handleCustomChange("primary.main", e.target.value)}
                    className="font-mono text-sm uppercase max-w-[140px]"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="space-y-2">
                <Label htmlFor="secondary-color">Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="secondary-color"
                    type="color"
                    value={customConfig.secondary?.main || "#5B7C8D"}
                    onChange={(e) => handleCustomChange("secondary.main", e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-input p-0.5"
                  />
                  <Input
                    type="text"
                    value={customConfig.secondary?.main || "#5B7C8D"}
                    onChange={(e) => handleCustomChange("secondary.main", e.target.value)}
                    className="font-mono text-sm uppercase max-w-[140px]"
                  />
                </div>
              </div>

              {/* App Background */}
              <div className="space-y-2">
                <Label htmlFor="bg-color">Application Background</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="bg-color"
                    type="color"
                    value={customConfig.background?.default || "#F4F8F9"}
                    onChange={(e) => handleCustomChange("background.default", e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-input p-0.5"
                  />
                  <Input
                    type="text"
                    value={customConfig.background?.default || "#F4F8F9"}
                    onChange={(e) => handleCustomChange("background.default", e.target.value)}
                    className="font-mono text-sm uppercase max-w-[140px]"
                  />
                </div>
              </div>

              {/* Border Radius */}
              <div className="space-y-2">
                <Label htmlFor="radius">Corner Border Radius</Label>
                <select
                  id="radius"
                  value={customConfig.border?.radius || "0.5rem"}
                  onChange={(e) => handleCustomChange("border.radius", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="0.25rem">Sharp (0.25rem / 4px)</option>
                  <option value="0.5rem">Standard (0.5rem / 8px)</option>
                  <option value="0.75rem">Rounded (0.75rem / 12px)</option>
                  <option value="1rem">Soft (1rem / 16px)</option>
                  <option value="1.25rem">Pill (1.25rem / 20px)</option>
                </select>
              </div>

              {/* Font Family Display */}
              <div className="space-y-2">
                <Label htmlFor="font-display">Display / Heading Font</Label>
                <select
                  id="font-display"
                  value={customConfig.typography?.fontFamilyDisplay || "Inter"}
                  onChange={(e) => handleCustomChange("typography.fontFamilyDisplay", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Inter">Inter</option>
                  <option value="Sora">Sora</option>
                  <option value="Manrope">Manrope</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Fraunces">Fraunces</option>
                  <option value="Epilogue">Epilogue</option>
                  <option value="Space Grotesk">Space Grotesk</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Urbanist">Urbanist</option>
                  <option value="Figtree">Figtree</option>
                </select>
              </div>

              {/* Font Family Body */}
              <div className="space-y-2">
                <Label htmlFor="font-body">Body Font</Label>
                <select
                  id="font-body"
                  value={customConfig.typography?.fontFamilyBody || "Inter"}
                  onChange={(e) => handleCustomChange("typography.fontFamilyBody", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Inter">Inter</option>
                  <option value="DM Sans">DM Sans</option>
                  <option value="Work Sans">Work Sans</option>
                  <option value="Manrope">Manrope</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Figtree">Figtree</option>
                </select>
              </div>
            </Card>

            {/* Live Interactive Preview Card */}
            <Card className="lg:col-span-6 p-6 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" /> Live UI Component Preview
              </h3>

              <div className="space-y-4 p-4 rounded-2xl bg-background border shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b">
                  <h4 className="font-bold text-foreground">Sample Dashboard Widget</h4>
                  <Badge variant="default">Active</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/50 border flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Total Enrolled</span>
                    <span className="text-2xl font-black text-primary">1,248</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 border flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Completion Rate</span>
                    <span className="text-2xl font-black text-primary">94.2%</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>Primary Action Button</Label>
                  <div className="flex gap-2">
                    <Button className="w-full">Primary Button</Button>
                    <Button variant="outline" className="w-full">Outline</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
