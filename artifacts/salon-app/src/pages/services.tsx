import { 
  useListServices, 
  getListServicesQueryKey,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useListPayments,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, Scissors, Clock, Sparkles, TrendingUp } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const serviceSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido (ex: 45.00)"),
  durationMinutes: z.coerce.number().min(5, "Duração mínima de 5 minutos"),
  category: z.string().min(2, "Categoria é obrigatória"),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const categoryColors = [
  { bg: "hsl(338,60%,95%)", text: "hsl(338,60%,35%)", border: "hsl(338,40%,88%)", dot: "hsl(338,60%,38%)" },
  { bg: "hsl(35,70%,93%)", text: "hsl(35,70%,38%)", border: "hsl(35,50%,85%)", dot: "hsl(35,70%,52%)" },
  { bg: "hsl(280,40%,94%)", text: "hsl(280,40%,38%)", border: "hsl(280,30%,87%)", dot: "hsl(280,40%,45%)" },
  { bg: "hsl(200,50%,93%)", text: "hsl(200,50%,30%)", border: "hsl(200,35%,85%)", dot: "hsl(200,50%,40%)" },
  { bg: "hsl(150,40%,93%)", text: "hsl(150,40%,28%)", border: "hsl(150,30%,85%)", dot: "hsl(150,40%,38%)" },
];

const currentMonth = format(new Date(), "yyyy-MM");

export default function Services() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useListServices(undefined, {
    query: { queryKey: getListServicesQueryKey() }
  });
  const { data: monthPayments } = useListPayments({ month: currentMonth }, {
    query: { queryKey: getListPaymentsQueryKey({ month: currentMonth }) }
  });

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", description: "", price: "", durationMinutes: 60, category: "Cabelo" },
  });

  const onSubmitAdd = (data: ServiceFormValues) => {
    createService.mutate({ data }, {
      onSuccess: () => {
        toast.success("Serviço adicionado!");
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        setIsAddOpen(false);
        form.reset();
      },
      onError: () => toast.error("Erro ao adicionar serviço")
    });
  };

  const onSubmitEdit = (data: ServiceFormValues) => {
    if (!editingId) return;
    updateService.mutate({ id: editingId, data }, {
      onSuccess: () => {
        toast.success("Serviço atualizado!");
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        setIsEditOpen(false);
      },
      onError: () => toast.error("Erro ao atualizar serviço")
    });
  };

  const handleDelete = (id: number) => {
    deleteService.mutate({ id }, {
      onSuccess: () => {
        toast.success("Serviço removido");
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
      },
      onError: () => toast.error("Erro ao remover serviço")
    });
  };

  const openEdit = (service: any) => {
    form.reset({ name: service.name, description: service.description || "", price: service.price, durationMinutes: service.durationMinutes, category: service.category });
    setEditingId(service.id);
    setIsEditOpen(true);
  };

  const servicesByCategory = services?.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  const categories = Object.keys(servicesByCategory || {});

  const serviceStats = (monthPayments ?? []).reduce((acc, p) => {
    if (!acc[p.serviceName]) acc[p.serviceName] = { revenue: 0, count: 0 };
    acc[p.serviceName].revenue += parseFloat(p.amount);
    acc[p.serviceName].count += 1;
    return acc;
  }, {} as Record<string, { revenue: number; count: number }>);

  const topServices = Object.entries(serviceStats).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
  const totalRevenue = Object.values(serviceStats).reduce((s, v) => s + v.revenue, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold" style={{ background: "linear-gradient(135deg, hsl(338,60%,32%), hsl(338,55%,48%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Cardápio de Serviços
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie seus serviços e preços</p>
        </div>
        <Button className="rounded-xl shadow-md text-white font-semibold"
          style={{ background: "linear-gradient(135deg, hsl(338,60%,38%), hsl(320,55%,32%))" }}
          onClick={() => { form.reset({ durationMinutes: 60, category: 'Cabelo' }); setIsAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Serviço
        </Button>
      </div>

      {/* Top services stats */}
      {topServices.length > 0 && (
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "hsl(340,25%,90%)", boxShadow: "0 2px 8px rgba(160,60,90,0.06)" }}>
          <h2 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />Top Serviços — {format(new Date(), "MMMM", { locale: ptBR })}
          </h2>
          <div className="space-y-3">
            {topServices.map(([name, stats], i) => {
              const pct = totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0;
              const color = categoryColors[i % categoryColors.length];
              return (
                <div key={name}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-muted-foreground w-5">#{i + 1}</span>
                      <span className="text-sm font-semibold text-foreground">{name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: color.bg, color: color.text }}>
                        {stats.count}x
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: color.text }}>
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.revenue)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color.dot},${color.text})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : servicesByCategory && categories.length > 0 ? (
        <div className="space-y-10">
          {categories.map((category, catIdx) => {
            const color = categoryColors[catIdx % categoryColors.length];
            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${color.dot}, ${color.text})` }}>
                    <Scissors className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-xl font-serif font-bold" style={{ color: color.text }}>{category}</h2>
                  <div className="h-px flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${color.border}, transparent)` }} />
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: color.bg, color: color.text }}>
                    {servicesByCategory[category].length} {servicesByCategory[category].length === 1 ? 'serviço' : 'serviços'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {servicesByCategory[category].map(service => (
                    <div key={service.id} className="group relative bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                      style={{ borderColor: color.border, boxShadow: "0 2px 8px rgba(160,60,90,0.06)" }}>
                      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color.dot}, ${color.text})` }} />
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-serif font-semibold text-lg leading-tight pr-4">{service.name}</h3>
                          <div className="flex-shrink-0 text-xl font-bold" style={{ color: color.text }}>
                            R$ {service.price}
                          </div>
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{service.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: color.text }}>
                            <Clock className="h-4 w-4" />
                            {service.durationMinutes} min
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted/80" onClick={() => openEdit(service)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
                                  <AlertDialogDescription>Tem certeza que deseja excluir "{service.name}"?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(service.id)} className="rounded-xl bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl border-2 border-dashed" style={{ borderColor: "hsl(340,25%,88%)", background: "hsl(22,60%,98%)" }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg, hsl(22,60%,95%), hsl(340,40%,93%))" }}>
            <Sparkles className="h-9 w-9 text-primary/50" />
          </div>
          <h3 className="font-serif text-2xl font-semibold">Nenhum serviço ainda</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">Comece adicionando os serviços do seu salão.</p>
          <Button className="mt-6 rounded-xl text-white" style={{ background: "linear-gradient(135deg, hsl(338,60%,38%), hsl(320,55%,32%))" }}
            onClick={() => { form.reset(); setIsAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Primeiro Serviço
          </Button>
        </div>
      )}

      {(isAddOpen || isEditOpen) && (
        <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
          if (!open) { setIsAddOpen(false); setIsEditOpen(false); setEditingId(null); }
        }}>
          <DialogContent className="sm:max-w-[440px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">{isEditOpen ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(isEditOpen ? onSubmitEdit : onSubmitAdd)} className="space-y-4 mt-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nome do Serviço *</FormLabel><FormControl><Input className="rounded-xl" placeholder="ex: Corte + Escova" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$) *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-medium">R$</span>
                          <Input className="pl-9 rounded-xl" placeholder="80.00" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (min) *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type="number" className="pl-9 rounded-xl" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <FormControl><Input className="rounded-xl" placeholder="ex: Cabelo, Unhas, Estética" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">Serviços são agrupados por categoria.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea className="rounded-xl resize-none" placeholder="Descreva o serviço..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full rounded-xl h-11 text-white font-semibold mt-2"
                  style={{ background: "linear-gradient(135deg, hsl(338,60%,38%), hsl(320,55%,32%))" }}
                  disabled={createService.isPending || updateService.isPending}>
                  {(createService.isPending || updateService.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditOpen ? "Atualizar Serviço" : "Salvar Serviço"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
