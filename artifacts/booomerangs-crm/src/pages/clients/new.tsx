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
import {
  ArrowLeft, Loader2, Building2, User, MapPin, Phone, Mail,
  Tag, MessageSquare, Briefcase, Globe, Instagram, Send, Percent, Truck, Hash,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

const VkIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm3.08 13.55h-1.86c-.7 0-.92-.56-2.18-1.83-1.1-1.06-1.59-.99-1.59.16v1.55c0 .38-.14.55-1.08.55-1.86 0-3.55-1.11-4.82-3.06C5.33 10.74 5 9.14 5 8.89c0-.15.06-.28.21-.38h1.86c.14 0 .26.07.35.21.7 1.72 2.06 3.35 2.61 3.35.22 0 .28-.1.28-.65V9.59c-.07-1.12-.65-1.22-.65-1.62 0-.19.14-.38.36-.38h2.92c.24 0 .34.12.34.38v2.92c0 .24.12.38.37.38.22 0 .41-.14.81-.56 1.01-1.14 1.74-2.9 1.74-2.9.1-.2.26-.38.48-.38h1.86c.56 0 .68.3.56.68-.24.84-2.34 3.82-2.34 3.82-.18.3-.24.43 0 .75.17.26.73.75 1.1 1.2.71.84 1.26 1.55 1.4 2.04.13.48-.08.74-.55.74z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

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
  instagram: z.string().optional(),
  vk: z.string().optional(),
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
  inn: z.string().optional(),
  discount: z.coerce.number().min(0).max(100).optional().or(z.literal(0)),
  deliveryAddress: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

function FormField({ id, label, icon: Icon, placeholder, type = "text", registration, error, className }: {
  id: string; label: string; icon: React.ElementType; placeholder?: string;
  type?: string; registration: object; error?: string; className?: string;
}) {
  return (
    <div className={`space-y-2 ${className || ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id={id} type={type} placeholder={placeholder} {...registration}
          className="pl-9 bg-background border-border focus-visible:ring-primary" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function NewClientPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: "", contactName: "", phone: "", email: "",
      city: "", region: "", category: "", status: "prospect",
      notes: "", orderVolume: 0, instagram: "", vk: "", telegram: "",
      whatsapp: "", website: "", inn: "", discount: 0, deliveryAddress: "",
    },
  });

  const createClient = useCreateClient();

  const onSubmit = (data: ClientFormValues) => {
    createClient.mutate({ data }, {
      onSuccess: (newClient) => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetClientsStatsQueryKey() });
        toast({ title: "Клиент добавлен", description: "Новый клиент успешно сохранен в базе." });
        setLocation(`/clients/${newClient.id}`);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Ошибка", description: "Не удалось добавить клиента." });
      },
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto">
        <div className="flex flex-col gap-3">
          <button onClick={() => setLocation("/clients")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" /> Назад к списку
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Новый клиент</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Добавление нового партнера в базу BOOOMERANGS.</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Основная информация */}
          <Card className="bg-card border-border shadow-none rounded-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Building2 className="h-5 w-5" />
                <h2 className="text-base font-display font-semibold text-foreground">Основная информация</h2>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Название компании / ИП *</Label>
                <Input id="companyName" placeholder="Например, ИП Иванов И.И."
                  {...form.register("companyName")}
                  className="bg-background border-border focus-visible:ring-primary" />
                {form.formState.errors.companyName && (
                  <p className="text-xs text-destructive">{form.formState.errors.companyName.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Статус *</Label>
                  <Controller control={form.control} name="status"
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
                    )} />
                </div>
                <FormField id="category" label="Категория" icon={Tag}
                  placeholder="Стрит-шоп, Опт..." registration={form.register("category")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField id="inn" label="ИНН" icon={Hash}
                  placeholder="123456789012" registration={form.register("inn")} />
                <div className="space-y-2">
                  <Label htmlFor="discount">Скидка %</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="discount" type="number" placeholder="0"
                      {...form.register("discount")}
                      className="pl-9 bg-background border-border focus-visible:ring-primary" />
                  </div>
                </div>
              </div>
              <FormField id="orderVolume" label="Объем заказов (₽)" icon={Briefcase}
                type="number" placeholder="0" registration={form.register("orderVolume")} />
            </CardContent>
          </Card>

          {/* Контакты */}
          <Card className="bg-card border-border shadow-none rounded-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <User className="h-5 w-5" />
                <h2 className="text-base font-display font-semibold text-foreground">Контакты</h2>
              </div>
              <FormField id="contactName" label="Контактное лицо" icon={User}
                placeholder="Имя Фамилия" registration={form.register("contactName")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField id="phone" label="Телефон" icon={Phone}
                  placeholder="+7 (999) 000-00-00" registration={form.register("phone")} />
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="client@example.com"
                      {...form.register("email")}
                      className="pl-9 bg-background border-border focus-visible:ring-primary" />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Соцсети */}
          <Card className="bg-card border-border shadow-none rounded-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Globe className="h-5 w-5" />
                <h2 className="text-base font-display font-semibold text-foreground">Соцсети и сайт</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField id="instagram" label="Instagram" icon={Instagram}
                  placeholder="@username или ссылка" registration={form.register("instagram")} />
                <div className="space-y-2">
                  <Label htmlFor="vk">ВКонтакте</Label>
                  <div className="relative">
                    <VkIcon />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                      <VkIcon />
                    </span>
                    <Input id="vk" placeholder="@username или ссылка"
                      {...form.register("vk")}
                      className="pl-9 bg-background border-border focus-visible:ring-primary" />
                  </div>
                </div>
                <FormField id="telegram" label="Telegram" icon={Send}
                  placeholder="@username или ссылка" registration={form.register("telegram")} />
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground">
                      <WhatsAppIcon />
                    </span>
                    <Input id="whatsapp" placeholder="+7 999 000-00-00"
                      {...form.register("whatsapp")}
                      className="pl-9 bg-background border-border focus-visible:ring-primary" />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="website">Сайт</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="website" placeholder="https://..."
                      {...form.register("website")}
                      className="pl-9 bg-background border-border focus-visible:ring-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Локация */}
          <Card className="bg-card border-border shadow-none rounded-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                <h2 className="text-base font-display font-semibold text-foreground">Локация</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Город</Label>
                  <Input id="city" placeholder="Москва"
                    {...form.register("city")}
                    className="bg-background border-border focus-visible:ring-primary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Регион / Округ</Label>
                  <Input id="region" placeholder="ЦФО"
                    {...form.register("region")}
                    className="bg-background border-border focus-visible:ring-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">Адрес доставки</Label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="deliveryAddress" placeholder="Улица, дом, офис/склад..."
                    {...form.register("deliveryAddress")}
                    className="pl-9 bg-background border-border focus-visible:ring-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Заметки */}
          <Card className="bg-card border-border shadow-none rounded-sm">
            <CardContent className="p-4 md:p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare className="h-5 w-5" />
                <h2 className="text-base font-display font-semibold text-foreground">Заметки</h2>
              </div>
              <Textarea id="notes" placeholder="Условия работы, предпочтения по ассортименту, особые пожелания..."
                {...form.register("notes")}
                className="min-h-[100px] bg-background border-border resize-y" />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1 pb-2">
            <Button type="button" variant="outline" onClick={() => setLocation("/clients")}
              className="border-border flex-1 sm:flex-none">
              Отмена
            </Button>
            <Button type="submit" disabled={createClient.isPending} className="flex-1 sm:flex-none font-medium">
              {createClient.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Сохранение...</>
              ) : "Добавить клиента"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
