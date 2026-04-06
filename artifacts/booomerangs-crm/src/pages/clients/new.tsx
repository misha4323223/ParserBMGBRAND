import { AppLayout } from "@/components/layout/app-layout";
import { useCreateClient, getListClientsQueryKey, getGetClientsStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Building2, User, MapPin, Phone, Mail, FolderTree, Tag, MessageSquare, Briefcase } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  orderVolume: z.coerce.number().min(0, "Должно быть положительным числом").optional().or(z.literal(0)),
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
          toast({
            title: "Клиент добавлен",
            description: "Новый клиент успешно сохранен в базе.",
          });
          setLocation(`/clients/${newClient.id}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Ошибка",
            description: "Не удалось добавить клиента. Попробуйте еще раз.",
          });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full max-w-4xl mx-auto">
        <div className="flex flex-col gap-4">
          <Link href="/clients" className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-1 w-fit transition-colors">
            <ArrowLeft className="h-4 w-4" /> Назад к списку
          </Link>
          
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Новый клиент</h1>
            <p className="text-muted-foreground mt-1">Добавление нового партнера в базу BOOOMERANGS.</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-10">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Building2 className="h-5 w-5" />
                  <h2 className="text-lg font-display font-semibold text-foreground">Основная информация</h2>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyName">Название компании / ИП *</Label>
                  <Input 
                    id="companyName" 
                    placeholder="Например, ИП Иванов И.И." 
                    {...form.register("companyName")}
                    className="bg-background border-border focus-visible:ring-primary"
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-xs text-destructive">{form.formState.errors.companyName.message}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Статус *</Label>
                    <Controller
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="bg-background border-border focus-visible:ring-primary">
                            <SelectValue placeholder="Выберите статус" />
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
                        className="pl-9 bg-background border-border focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderVolume">Ориентировочный объем заказов (₽)</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="orderVolume" 
                      type="number"
                      placeholder="0" 
                      {...form.register("orderVolume")}
                      className="pl-9 bg-background border-border focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <User className="h-5 w-5" />
                  <h2 className="text-lg font-display font-semibold text-foreground">Контакты</h2>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactName">Контактное лицо</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="contactName" 
                      placeholder="Имя Фамилия" 
                      {...form.register("contactName")}
                      className="pl-9 bg-background border-border focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      placeholder="+7 (999) 000-00-00" 
                      {...form.register("phone")}
                      className="pl-9 bg-background border-border focus-visible:ring-primary"
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
                      className="pl-9 bg-background border-border focus-visible:ring-primary"
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border shadow-none rounded-sm md:col-span-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <MapPin className="h-5 w-5" />
                  <h2 className="text-lg font-display font-semibold text-foreground">Локация</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">Город</Label>
                    <Input 
                      id="city" 
                      placeholder="Например, Москва" 
                      {...form.register("city")}
                      className="bg-background border-border focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Регион</Label>
                    <Input 
                      id="region" 
                      placeholder="Например, Московская область" 
                      {...form.register("region")}
                      className="bg-background border-border focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-none rounded-sm md:col-span-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <MessageSquare className="h-5 w-5" />
                  <h2 className="text-lg font-display font-semibold text-foreground">Дополнительно</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Заметки и комментарии</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Условия работы, особенности доставки, предпочтения по ассортименту..." 
                    {...form.register("notes")}
                    className="min-h-[120px] bg-background border-border focus-visible:ring-primary resize-y"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setLocation("/clients")}
              className="border-border text-foreground hover:bg-accent/10 hover:text-accent"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={createClient.isPending}
              className="font-medium"
            >
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
