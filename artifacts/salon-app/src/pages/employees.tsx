import { 
  useListEmployees, 
  getListEmployeesQueryKey,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useListPayments,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, Mail, Phone, Percent, Sparkles, Heart, TrendingUp } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const employeeSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  commissionPct: z.coerce.number().min(0).max(100).optional(),
  specialties: z.string().transform(str => str.split(',').map(s => s.trim()).filter(Boolean))
});

const avatarGradients = [
  "linear-gradient(135deg, hsl(338,60%,38%) 0%, hsl(320,55%,32%) 100%)",
  "linear-gradient(135deg, hsl(35,70%,52%) 0%, hsl(20,65%,48%) 100%)",
  "linear-gradient(135deg, hsl(280,50%,50%) 0%, hsl(300,45%,40%) 100%)",
  "linear-gradient(135deg, hsl(200,55%,45%) 0%, hsl(220,50%,38%) 100%)",
  "linear-gradient(135deg, hsl(150,45%,42%) 0%, hsl(170,40%,35%) 100%)",
];

const currentMonth = format(new Date(), "yyyy-MM");

export default function Employees() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useListEmployees({
    query: { queryKey: getListEmployeesQueryKey() }
  });
  const { data: monthPayments } = useListPayments({ month: currentMonth }, {
    query: { queryKey: getListPaymentsQueryKey({ month: currentMonth }) }
  });

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const form = useForm<any>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: "", email: "", phone: "", commissionPct: 0, specialties: "" },
  });

  const onSubmitAdd = (data: any) => {
    createEmployee.mutate({ data }, {
      onSuccess: () => {
        toast.success("Profissional cadastrada com sucesso!");
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        setIsAddOpen(false);
        form.reset();
      },
      onError: () => toast.error("Erro ao cadastrar profissional")
    });
  };

  const onSubmitEdit = (data: any) => {
    if (!editingId) return;
    updateEmployee.mutate({ id: editingId, data }, {
      onSuccess: () => {
        toast.success("Perfil atualizado!");
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        setIsEditOpen(false);
      },
      onError: () => toast.error("Erro ao atualizar perfil")
    });
  };

  const handleDelete = (id: number) => {
    deleteEmployee.mutate({ id }, {
      onSuccess: () => {
        toast.success("Profissional removida");
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
      },
      onError: () => toast.error("Erro ao remover profissional")
    });
  };

  const openEdit = (emp: any) => {
    form.reset({ name: emp.name, email: emp.email || "", phone: emp.phone || "", commissionPct: emp.commissionPct || 0, specialties: emp.specialties?.join(", ") || "" });
    setEditingId(emp.id);
    setIsEditOpen(true);
  };

  const empStats = (monthPayments ?? []).reduce((acc, p) => {
    if (!acc[p.employeeName]) acc[p.employeeName] = { revenue: 0, count: 0 };
    acc[p.employeeName].revenue += parseFloat(p.amount);
    acc[p.employeeName].count += 1;
    return acc;
  }, {} as Record<string, { revenue: number; count: number }>);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold" style={{ background: "linear-gradient(135deg, hsl(338,60%,32%), hsl(338,55%,48%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Nossa Equipe
          </h1>
          <p className="text-muted-foreground mt-1">Profissionais talentosas do seu salão</p>
        </div>
        <Button className="rounded-xl shadow-md text-white font-semibold"
          style={{ background: "linear-gradient(135deg, hsl(338,60%,38%), hsl(320,55%,32%))" }}
          onClick={() => { form.reset(); setIsAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Profissional
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : employees && employees.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {employees.map((emp, idx) => (
            <div key={emp.id} className="group bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              style={{ borderColor: "hsl(340,25%,90%)", boxShadow: "0 2px 12px rgba(160,60,90,0.06)" }}>
              {/* Header gradient */}
              <div className="h-20 relative" style={{ background: avatarGradients[idx % avatarGradients.length] }}>
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <button onClick={() => openEdit(emp)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/40 text-white transition-colors">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/20 hover:bg-red-400/60 text-white transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Profissional</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja remover {emp.name}?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(emp.id)} className="rounded-xl bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Avatar */}
              <div className="px-5 pb-5">
                <div className="-mt-10 mb-4 w-20 h-20 rounded-2xl border-4 border-white flex items-center justify-center text-2xl font-serif font-bold text-white shadow-md relative z-10"
                  style={{ background: avatarGradients[idx % avatarGradients.length] }}>
                  {emp.name.charAt(0).toUpperCase()}
                </div>

                <h3 className="font-serif text-xl font-bold text-foreground">{emp.name}</h3>

                {/* Stats do mês */}
                {empStats[emp.name] && (
                  <div className="mt-2 mb-1 flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ background: "hsl(338,60%,95%)", color: "hsl(338,60%,38%)" }}>
                      <TrendingUp className="h-3 w-3" />
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(empStats[emp.name].revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {empStats[emp.name].count} atend.
                    </div>
                  </div>
                )}

                <div className="mt-3 space-y-1.5 text-sm">
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />{emp.phone}
                    </div>
                  )}
                  {emp.email && (
                    <div className="flex items-center gap-2 text-muted-foreground break-all">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />{emp.email}
                    </div>
                  )}
                  {emp.commissionPct != null && emp.commissionPct > 0 && (
                    <div className="flex items-center gap-2 font-semibold" style={{ color: "hsl(338,60%,40%)" }}>
                      <Percent className="h-3.5 w-3.5" />{emp.commissionPct}% comissão
                    </div>
                  )}
                </div>

                {emp.specialties && emp.specialties.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Especialidades
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {emp.specialties.map((s, i) => (
                        <span key={i} className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                          style={{ background: "hsl(338,60%,95%)", color: "hsl(338,60%,35%)" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl border-2 border-dashed" style={{ borderColor: "hsl(340,25%,88%)", background: "hsl(22,60%,98%)" }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg, hsl(22,60%,95%), hsl(340,40%,93%))" }}>
            <Heart className="h-9 w-9 text-primary/40" />
          </div>
          <h3 className="font-serif text-2xl font-semibold">Equipe vazia por enquanto</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">Adicione profissionais para começar a organizar os atendimentos.</p>
          <Button className="mt-6 rounded-xl text-white" style={{ background: "linear-gradient(135deg, hsl(338,60%,38%), hsl(320,55%,32%))" }}
            onClick={() => { form.reset(); setIsAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Profissional
          </Button>
        </div>
      )}

      {(isAddOpen || isEditOpen) && (
        <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
          if (!open) { setIsAddOpen(false); setIsEditOpen(false); setEditingId(null); }
        }}>
          <DialogContent className="sm:max-w-[440px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">{isEditOpen ? "Editar Profissional" : "Nova Profissional"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(isEditOpen ? onSubmitEdit : onSubmitAdd)} className="space-y-4 mt-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="commissionPct" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual de Comissão</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" min="0" max="100" className="pr-10 rounded-xl" {...field} />
                        <Percent className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Calculado no relatório financeiro.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="specialties" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidades</FormLabel>
                    <FormControl><Input className="rounded-xl" placeholder="Coloração, Balayage, Escova (separar por vírgula)" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full rounded-xl h-11 text-white font-semibold mt-2"
                  style={{ background: "linear-gradient(135deg, hsl(338,60%,38%), hsl(320,55%,32%))" }}
                  disabled={createEmployee.isPending || updateEmployee.isPending}>
                  {(createEmployee.isPending || updateEmployee.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditOpen ? "Atualizar Perfil" : "Cadastrar Profissional"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
