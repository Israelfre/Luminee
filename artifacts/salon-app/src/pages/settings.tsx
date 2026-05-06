import { 
  useGetSalon, 
  getGetSalonQueryKey,
  useUpdateSalon
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Store, MapPin, Phone, Mail, Instagram, MessageCircle, Flower2, Upload, X, Palette, Check, Sparkles, RefreshCw } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useTheme, buildCustomPalette, applyPalette } from "@/contexts/theme-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

const MAX_LOGO_MB = 5;

const settingsSchema = z.object({
  name: z.string().min(2, "Nome do salão é obrigatório"),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Settings() {
  const queryClient = useQueryClient();
  const updateSalon = useUpdateSalon();
  const { activePaletteId, palettes, customPrimaryHex, customSecondaryHex, setPalette, applyAndSaveCustom } = useTheme();

  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [logoData, setLogoData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // custom color picker state
  const [localPrimary, setLocalPrimary] = useState(customPrimaryHex);
  const [localSecondary, setLocalSecondary] = useState(customSecondaryHex);
  const [livePreview, setLivePreview] = useState(false);

  useEffect(() => {
    setLocalPrimary(customPrimaryHex);
    setLocalSecondary(customSecondaryHex);
  }, [customPrimaryHex, customSecondaryHex]);

  const { data: salon, isLoading } = useGetSalon({
    query: { queryKey: getGetSalonQueryKey() }
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { name: "", phone: "", email: "", address: "", instagram: "", whatsapp: "" },
  });

  useEffect(() => {
    if (salon) {
      form.reset({
        name: salon.name || "", phone: salon.phone || "", email: salon.email || "",
        address: salon.address || "", instagram: salon.instagram || "", whatsapp: salon.whatsapp || "",
      });
      if (salon.logoUrl) setPreviewLogo(salon.logoUrl);
    }
  }, [salon, form]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${MAX_LOGO_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewLogo(dataUrl);
      setLogoData(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setPreviewLogo(null);
    setLogoData("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaletteSelect = (id: string) => {
    setPalette(id);
    const palette = palettes.find(p => p.id === id);
    if (!palette) return;
    updateSalon.mutate(
      { data: { primaryColor: palette.primary, secondaryColor: palette.secondary } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSalonQueryKey() }) }
    );
  };

  // Live preview as colors are picked
  const handleCustomColorChange = (primary: string, secondary: string) => {
    if (livePreview) {
      applyPalette(buildCustomPalette(primary, secondary));
    }
  };

  const handleApplyCustom = () => {
    applyAndSaveCustom(localPrimary, localSecondary);
    const palette = buildCustomPalette(localPrimary, localSecondary);
    updateSalon.mutate(
      { data: { primaryColor: palette.primary, secondaryColor: palette.secondary } },
      {
        onSuccess: () => {
          toast.success("Cores personalizadas aplicadas!");
          queryClient.invalidateQueries({ queryKey: getGetSalonQueryKey() });
        },
        onError: () => toast.error("Erro ao salvar cores")
      }
    );
  };

  const onSubmit = (data: SettingsFormValues) => {
    const updateData: Record<string, unknown> = { ...data };
    if (logoData !== null) updateData.logoUrl = logoData;

    updateSalon.mutate({ data: updateData as Parameters<typeof updateSalon.mutate>[0]["data"] }, {
      onSuccess: () => {
        toast.success("Configurações salvas!");
        queryClient.invalidateQueries({ queryKey: getGetSalonQueryKey() });
        setLogoData(null);
      },
      onError: () => toast.error("Erro ao salvar configurações")
    });
  };

  const customPreviewColors = [localPrimary, localSecondary];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">Personalize a identidade do seu salão</p>
      </div>

      {/* ─── PALETA DE CORES ─── */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--primary) / 0.15)", boxShadow: "0 4px 20px hsl(var(--primary) / 0.08)" }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: "hsl(var(--primary) / 0.1)", background: "hsl(var(--primary) / 0.03)" }}>
          <h2 className="font-serif text-lg font-bold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Paleta de Cores
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Escolha entre 12 temas ou crie o seu. Aplicado instantaneamente!</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Predefined palettes grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {palettes.map((palette) => {
              const isActive = activePaletteId === palette.id;
              return (
                <button
                  key={palette.id}
                  onClick={() => handlePaletteSelect(palette.id)}
                  className="relative p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                  style={{
                    borderColor: isActive ? palette.previewColors[0] : "hsl(var(--border))",
                    background: isActive ? `${palette.previewColors[0]}14` : "white",
                    boxShadow: isActive ? `0 4px 16px ${palette.previewColors[0]}35` : undefined
                  }}
                >
                  <div className="flex gap-1.5 mb-3">
                    {palette.previewColors.map((color, i) => (
                      <div key={i} className="flex-1 h-6 rounded-lg shadow-sm" style={{ background: color }} />
                    ))}
                  </div>
                  <div className="font-semibold text-sm text-foreground">{palette.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{palette.description}</div>
                  {isActive && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: palette.previewColors[0] }}>
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Custom color picker ── */}
          <div
            className="rounded-2xl border-2 overflow-hidden transition-all duration-200"
            style={{
              borderColor: activePaletteId === "custom" ? localPrimary : "hsl(var(--border))",
              background: activePaletteId === "custom" ? `${localPrimary}10` : "white",
              boxShadow: activePaletteId === "custom" ? `0 4px 16px ${localPrimary}30` : undefined
            }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: activePaletteId === "custom" ? `${localPrimary}25` : "hsl(var(--border))" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: localPrimary }} />
                <span className="font-semibold text-sm">Personalizado</span>
                <span className="text-xs text-muted-foreground">— crie sua identidade única</span>
              </div>
              {activePaletteId === "custom" && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: localPrimary }}>
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Preview swatches */}
              <div className="flex gap-2 h-10 rounded-xl overflow-hidden shadow-sm">
                <div className="flex-1" style={{ background: localPrimary }} />
                <div className="flex-1" style={{ background: localSecondary }} />
                <div className="w-16 rounded-r-xl" style={{
                  background: `linear-gradient(135deg, ${localPrimary} 0%, color-mix(in srgb, ${localPrimary} 60%, black) 100%)`
                }} />
              </div>

              {/* Color inputs */}
              <div className="grid grid-cols-2 gap-4">
                {/* Primary */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Cor Principal</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl shadow-md border border-black/10 overflow-hidden cursor-pointer"
                        style={{ background: localPrimary }}>
                        <input
                          type="color"
                          value={localPrimary}
                          onChange={(e) => {
                            setLocalPrimary(e.target.value);
                            handleCustomColorChange(e.target.value, localSecondary);
                          }}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={localPrimary}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                          setLocalPrimary(v);
                          if (v.length === 7) handleCustomColorChange(v, localSecondary);
                        }
                      }}
                      className="flex-1 text-xs font-mono rounded-lg border px-2 py-1.5 min-w-0 uppercase"
                      style={{ borderColor: "hsl(var(--border))" }}
                      maxLength={7}
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Secondary */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Cor de Destaque</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl shadow-md border border-black/10 overflow-hidden cursor-pointer"
                        style={{ background: localSecondary }}>
                        <input
                          type="color"
                          value={localSecondary}
                          onChange={(e) => {
                            setLocalSecondary(e.target.value);
                            handleCustomColorChange(localPrimary, e.target.value);
                          }}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={localSecondary}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                          setLocalSecondary(v);
                          if (v.length === 7) handleCustomColorChange(localPrimary, v);
                        }
                      }}
                      className="flex-1 text-xs font-mono rounded-lg border px-2 py-1.5 min-w-0 uppercase"
                      style={{ borderColor: "hsl(var(--border))" }}
                      maxLength={7}
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>

              {/* Live preview toggle + Apply button */}
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => {
                      const next = !livePreview;
                      setLivePreview(next);
                      if (next) applyPalette(buildCustomPalette(localPrimary, localSecondary));
                    }}
                    className="w-9 h-5 rounded-full transition-colors relative cursor-pointer"
                    style={{ background: livePreview ? localPrimary : "hsl(var(--muted))" }}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${livePreview ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">Pré-visualização ao vivo</span>
                </label>

                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs h-8 px-3"
                    onClick={() => {
                      setLocalPrimary(customPrimaryHex);
                      setLocalSecondary(customSecondaryHex);
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Resetar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl text-xs h-8 px-4 text-white font-semibold"
                    style={{ background: `linear-gradient(135deg, ${localPrimary}, color-mix(in srgb, ${localPrimary} 60%, black))` }}
                    onClick={handleApplyCustom}
                    disabled={updateSalon.isPending}
                  >
                    {updateSalon.isPending
                      ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      : <Check className="h-3 w-3 mr-1" />
                    }
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── LOGO E IDENTIDADE ─── */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--primary) / 0.15)", boxShadow: "0 4px 20px hsl(var(--primary) / 0.08)" }}>
        {/* Header banner */}
        <div className="h-24 relative flex items-center px-6 gap-4"
          style={{ background: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--sidebar)) 100%)` }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 0%, transparent 50%)" }} />
          {previewLogo ? (
            <img src={previewLogo} alt={salon?.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/40 shadow-lg flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 border-2 border-white/20">
              <Flower2 className="h-7 w-7 text-white" />
            </div>
          )}
          <div>
            <div className="text-white font-serif text-xl font-bold">{salon?.name || "Seu Salão"}</div>
            <div className="text-white/55 text-sm">{salon?.email || "Configure seu e-mail abaixo"}</div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Logo upload */}
          <div>
            <h3 className="font-serif text-lg font-bold mb-1 flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Logotipo do Salão
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              PNG, JPG ou WebP — máximo <strong>{MAX_LOGO_MB}MB</strong>. Aparece na sidebar e no cabeçalho.
            </p>

            <div className="flex items-center gap-4">
              {previewLogo ? (
                <div className="relative">
                  <img src={previewLogo} alt="Logo" className="w-20 h-20 rounded-2xl object-cover border-2"
                    style={{ borderColor: "hsl(var(--primary) / 0.3)" }} />
                  <button onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: "hsl(var(--primary) / 0.3)", background: "hsl(var(--primary) / 0.04)" }}>
                  <Flower2 className="h-8 w-8" style={{ color: "hsl(var(--primary) / 0.3)" }} />
                </div>
              )}

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  {previewLogo ? "Trocar logo" : "Enviar logo"}
                </Button>
                {previewLogo && (
                  <p className="text-xs text-muted-foreground mt-2">Clique em <strong>Salvar</strong> para aplicar a nova logo.</p>
                )}
              </div>
            </div>
          </div>

          <Separator style={{ borderColor: "hsl(var(--primary) / 0.08)" }} />

          {/* Salon info form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-bold mb-1 flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" /> Informações do Salão
                </h3>
                <p className="text-sm text-muted-foreground mb-4">O nome aparece como título na sidebar e na aba do navegador.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nome do Salão *</FormLabel>
                      <FormControl>
                        <Input className="rounded-xl font-semibold text-base" placeholder="Ex: Bella Estética & Cabelos" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Este nome aparece no cabeçalho e na aba do navegador.</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail Comercial</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9 rounded-xl" type="email" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9 rounded-xl" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9 rounded-xl" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator style={{ borderColor: "hsl(var(--primary) / 0.08)" }} />

              <div>
                <h3 className="font-serif text-lg font-bold mb-1 flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-primary" /> Redes Sociais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField control={form.control} name="instagram" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9 rounded-xl" placeholder="@seusalao" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="whatsapp" render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MessageCircle className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9 rounded-xl" placeholder="+55 (11) 99999-9999" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="rounded-xl px-8 text-white font-semibold"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--sidebar)))" }}
                  disabled={updateSalon.isPending}
                >
                  {updateSalon.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
