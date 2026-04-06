import { AppLayout } from "@/components/layout/app-layout";
import { useCreateClient, getListClientsQueryKey, getGetClientsStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Building2, User, MapPin, Phone, Mail, Tag, MessageSquare, Briefcase } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

const clientSchema = z.object({
  companyName: z.string().min(2, "Название компании обязательно"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  city: z.string().optional(),
  region: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["active", "inactive", "prospect"]),
  notes: z.string().optional(),
  orderVolume: z.coerce.number().min(0).optional().or(z.literal(0)),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function NewClientPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      phone: "",
      email: "",
      city: "",
      region: "",
      category: "",
      status: "prospect",
      notes: "",
      orderVolume: 0,
    },
  });

  const createClient = useCreateClient();

  const onSubmit = (data: ClientFormValues) => {
    createClient.mutate(
      { data },
      {
        onSuccess: (newClient) => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetClientsStatsQueryKey() });
          toast({ title: "Клиент добавлен", description: "Новый клиент успешно сохранен в базе." });
          setLocation(`/clients/${newClient.id}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Ошибка",
            description: "Не удалось добавить клиента.",
          });
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setLocation("/clients")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" /> Назад к списку
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-foreground">Новый клиент</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Добавление нового партнера в базу BOOOMERANGS.</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Main info */}
          <Card className="bg-card border-border shadow-none rounded-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Building2 className="h-5 w-5" />
                <h2 className="text-base font-display font-semibold text-foreground">Основная информация</h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Название компании / ИП *</Label>
                <Input
                  id="companyName"
                  placeholder="Например, ИП Иванов"
                  {...form.register("companyName")}
                  className="bg-background border-border focus-visible:ring-primary"
                />
                {form.formState.errors.companyName && (
                  <p className="text-xs text-destructive">{form.formState.errors.companyName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Статус *</Label>
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Активный</SelectItem>
                          <SelectItem value="prospect">Потенциальный</SelectItem>
                          <SelectItem value="inactive">Неактивный</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Категория</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="category"
                      placeholder="Опт, Розница..."
                      {...form.register("category")}
                      className="pl-9 bg-background border-border"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderVolume">Объем заказов (₽)</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="orderVolume"
                    type="number"
                    placeholder="0"
                    {...form.register("orderVolume")}
                    className="pl-9 bg-background border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card className="bg-card border-border shadow-none rounded-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <User className="h-5 w-5" />
                <h2 className="text-base font-display font-semibold text-foreground">Контакты</h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">Контактное лицо</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contactName"
                    placeholder="Имя Фамилия"
                    {...form.register("contactName")}
                    className="pl-9 bg-background border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+7 (999) 000-00-00"
                      {...form.register("phone")}
                      className="pl-9 bg-background border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="client@example.com"
                      {...form.register("email")}
                      className="pl-9 bg-background border-border"
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="bg-card border-border shadow-none rounded-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <MapPin className="h-5 w-5" />
                <h2 className="text-base font-display font-semibold text-foreground">Локация</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Город</Label>
                  <Input
                    id="city"
                    placeholder="Москва"
                    {...form.register("city")}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Регион</Label>
                  <Input
                    id="region"
                    placeholder="ЦФО"
                    {...form.register("region")}
                    className="bg-background border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-card border-border shadow-none rounded-sm">
            <CardContent className="p-4 md:p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary mb-1">
                <MessageSquare className="h-5 w-5" />
                <h2 className="text-base font-display font-semibold text-foreground">Заметки</h2>
              </div>
              <Textarea
                id="notes"
                placeholder="Условия работы, предпочтения по ассортименту..."
                {...form.register("notes")}
                className="min-h-[100px] bg-background border-border resize-y"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1 pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/clients")}
              className="border-border flex-1 sm:flex-none"
            >
              Отмена
            </Button>
            <Button type="submit" disabled={createClient.isPending} className="flex-1 sm:flex-none font-medium">
              {createClient.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Добавить клиента"
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
