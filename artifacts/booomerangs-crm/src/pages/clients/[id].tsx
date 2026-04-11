import { AppLayout } from "@/components/layout/app-layout";
import {
  useGetClient,
  useUpdateClient,
  useDeleteClient,
  getListClientsQueryKey,
  getGetClientQueryKey,
  getGetClientsStatsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Loader2, Building2, User, MapPin, Phone, Mail,
  Tag, Calendar, MessageSquare, Trash2, Edit, Save, X,
  AlertTriangle, Globe, Instagram, Send, Percent, Truck, Hash,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const VkIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm3.08 13.55h-1.86c-.7 0-.92-.56-2.18-1.83-1.1-1.06-1.59-.99-1.59.16v1.55c0 .38-.14.55-1.08.55-1.86 0-3.55-1.11-4.82-3.06C5.33 10.74 5 9.14 5 8.89c0-.15.06-.28.21-.38h1.86c.14 0 .26.07.35.21.7 1.72 2.06 3.35 2.61 3.35.22 0 .28-.1.28-.65V9.59c-.07-1.12-.65-1.22-.65-1.62 0-.19.14-.38.36-.38h2.92c.24 0 .34.12.34.38v2.92c0 .24.12.38.37.38.22 0 .41-.14.81-.56 1.01-1.14 1.74-2.9 1.74-2.9.1-.2.26-.38.48-.38h1.86c.56 0 .68.3.56.68-.24.84-2.34 3.82-2.34 3.82-.18.3-.24.43 0 .75.17.26.73.75 1.1 1.2.71.84 1.26 1.55 1.4 2.04.13.48-.08.74-.55.74z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function SocialLink({ href, label }: { href: string; label: string }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="text-sm text-primary hover:underline break-all">
      {label}
    </a>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: client, isLoading, isError } = useGetClient(clientId, {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) },
  });

  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (client) {
      setFormData({
        companyName: client.companyName || "",
        contactName: client.contactName || "",
        phone: client.phone || "",
        email: client.email || "",
        city: client.city || "",
        region: client.region || "",
        category: client.category || "",
        status: client.status || "prospect",
        notes: client.notes || "",
        orderVolume: client.orderVolume || 0,
        lastContactDate: client.lastContactDate
          ? new Date(client.lastContactDate).toISOString().split("T")[0]
          : "",
        instagram: client.instagram || "",
        vk: client.vk || "",
        telegram: client.telegram || "",
        whatsapp: client.whatsapp || "",
        website: client.website || "",
        inn: client.inn || "",
        discount: client.discount || 0,
        deliveryAddress: client.deliveryAddress || "",
        lastOrderDate: client.lastOrderDate
          ? new Date(client.lastOrderDate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [client]);

  const handleSave = () => {
    updateClient.mutate(
      { id: clientId, data: formData as never },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetClientQueryKey(clientId), updated);
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetClientsStatsQueryKey() });
          setIsEditing(false);
          toast({ title: "Изменения сохранены", description: "Данные клиента успешно обновлены." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Ошибка", description: "Не удалось сохранить изменения." });
        },
      }
    );
  };

  const resetForm = () => {
    if (!client) return;
    setFormData({
      companyName: client.companyName || "", contactName: client.contactName || "",
      phone: client.phone || "", email: client.email || "", city: client.city || "",
      region: client.region || "", category: client.category || "",
      status: client.status || "prospect", notes: client.notes || "",
      orderVolume: client.orderVolume || 0,
      lastContactDate: client.lastContactDate
        ? new Date(client.lastContactDate).toISOString().split("T")[0]
        : "",
      instagram: client.instagram || "",
      vk: client.vk || "", telegram: client.telegram || "", whatsapp: client.whatsapp || "",
      website: client.website || "", inn: client.inn || "",
      discount: client.discount || 0, deliveryAddress: client.deliveryAddress || "",
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteClient.mutate({ id: clientId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetClientsStatsQueryKey() });
        toast({ title: "Клиент удален" });
        setLocation("/clients");
      },
      onError: () => {
        toast({ variant: "destructive", title: "Ошибка", description: "Не удалось удалить клиента." });
      },
    });
  };

  const handleChange = (field: string, value: unknown) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const getStatusLabel = (s: string) =>
    s === "active" ? "Активный" : s === "prospect" ? "Потенциальный" : "Неактивный";

  const getStatusColor = (s: string) =>
    s === "active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    : s === "prospect" ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
    : "bg-destructive/10 text-destructive border-destructive/20";

  const formatCurrency = (v?: number | null) =>
    !v ? "0 ₽" : new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(v);

  function Field({ label, icon: Icon, value, fieldKey, type = "text" }: {
    label: string; icon: React.ElementType; value: string | null | undefined;
    fieldKey: string; type?: string;
  }) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Icon className="h-3.5 w-3.5" /> {label}
        </p>
        {isEditing ? (
          <Input value={formData[fieldKey] as string} type={type}
            onChange={(e) => handleChange(fieldKey, e.target.value)}
            className="h-8 bg-background border-border text-sm" />
        ) : value ? (
          <p className="font-medium text-sm break-words">{value}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Не указано</p>
        )}
      </div>
    );
  }

  function SocialField({ label, icon: Icon, value, fieldKey, prefix }: {
    label: string; icon: React.ElementType; value: string | null | undefined;
    fieldKey: string; prefix?: string;
  }) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Icon className="h-3.5 w-3.5" /> {label}
        </p>
        {isEditing ? (
          <Input value={formData[fieldKey] as string}
            placeholder={prefix ? `${prefix}username` : "https://..."}
            onChange={(e) => handleChange(fieldKey, e.target.value)}
            className="h-8 bg-background border-border text-sm" />
        ) : value ? (
          <SocialLink href={value} label={value} />
        ) : (
          <p className="text-sm text-muted-foreground italic">Не указано</p>
        )}
      </div>
    );
  }

  if (isLoading) return (
    <AppLayout>
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </AppLayout>
  );

  if (isError || !client) return (
    <AppLayout>
      <div className="flex flex-col items-center gap-4 py-20">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-display font-semibold">Клиент не найден</h2>
        <Button onClick={() => setLocation("/clients")}>Вернуться</Button>
      </div>
    </AppLayout>
  );

  const hasSocials = client.instagram || client.vk || client.telegram || client.whatsapp || client.website;

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 md:gap-6 max-w-5xl mx-auto pb-4">
        {/* Back */}
        <button onClick={() => setLocation("/clients")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>

        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              {isEditing ? (
                <Input value={formData.companyName as string}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  className="text-xl font-bold bg-background border-border" />
              ) : (
                <h1 className="text-xl md:text-3xl font-display font-bold tracking-tight break-words">
                  {client.companyName}
                </h1>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {isEditing ? (
                  <Select value={formData.status as string} onValueChange={(v) => handleChange("status", v)}>
                    <SelectTrigger className="w-[160px] h-8 bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активный</SelectItem>
                      <SelectItem value="prospect">Потенциальный</SelectItem>
                      <SelectItem value="inactive">Неактивный</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={`rounded-sm border font-medium px-3 py-0.5 ${getStatusColor(client.status)}`}>
                    {getStatusLabel(client.status)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(client.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={resetForm} className="gap-1.5">
                    <X className="h-4 w-4" /> <span className="hidden sm:inline">Отмена</span>
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateClient.isPending} className="gap-1.5">
                    {updateClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="hidden sm:inline">Сохранить</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                    <Edit className="h-4 w-4" /> <span className="hidden sm:inline">Редактировать</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm"
                        className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Удалить</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border mx-4">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-display">Удалить клиента?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие необратимо. «{client.companyName}» будет удален навсегда.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4 md:col-span-2">

            {/* Основная информация */}
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-base font-display font-semibold flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-primary" /> Профиль компании
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Город" icon={MapPin} value={client.city} fieldKey="city" />
                  <Field label="Регион" icon={MapPin} value={client.region} fieldKey="region" />
                  <Field label="Категория" icon={Tag} value={client.category} fieldKey="category" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Дата контакта
                    </p>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={formData.lastContactDate as string}
                        onChange={(e) => handleChange("lastContactDate", e.target.value || null)}
                        className="h-8 bg-background border-border text-sm"
                      />
                    ) : (
                      <p className="font-medium text-sm">
                        {client.lastContactDate
                          ? new Date(client.lastContactDate).toLocaleDateString("ru-RU")
                          : <span className="text-muted-foreground italic">Не указано</span>}
                      </p>
                    )}
                  </div>
                  <Field label="ИНН" icon={Hash} value={client.inn} fieldKey="inn" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" /> Скидка %
                    </p>
                    {isEditing ? (
                      <Input type="number" value={formData.discount as number}
                        onChange={(e) => handleChange("discount", Number(e.target.value))}
                        className="h-8 bg-background border-border text-sm" />
                    ) : (
                      <p className="font-medium text-sm">
                        {client.discount ? `${client.discount}%` : <span className="text-muted-foreground italic">Не указано</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Адрес доставки */}
                <div className="mt-4 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> Адрес доставки
                  </p>
                  {isEditing ? (
                    <Input value={formData.deliveryAddress as string}
                      onChange={(e) => handleChange("deliveryAddress", e.target.value)}
                      className="h-8 bg-background border-border text-sm"
                      placeholder="Улица, дом, офис..." />
                  ) : client.deliveryAddress ? (
                    <p className="font-medium text-sm">{client.deliveryAddress}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Не указан</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Соцсети */}
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-base font-display font-semibold flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-primary" /> Соцсети и сайт
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SocialField label="Instagram" icon={Instagram} value={client.instagram} fieldKey="instagram" prefix="@" />
                  <SocialField label="ВКонтакте" icon={VkIcon} value={client.vk} fieldKey="vk" />
                  <SocialField label="Telegram" icon={Send} value={client.telegram} fieldKey="telegram" prefix="@" />
                  <SocialField label="WhatsApp" icon={WhatsAppIcon} value={client.whatsapp} fieldKey="whatsapp" />
                  <div className="sm:col-span-2 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> Сайт
                    </p>
                    {isEditing ? (
                      <Input value={formData.website as string} placeholder="https://..."
                        onChange={(e) => handleChange("website", e.target.value)}
                        className="h-8 bg-background border-border text-sm" />
                    ) : client.website ? (
                      <SocialLink href={client.website} label={client.website} />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Не указан</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Заметки */}
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-base font-display font-semibold flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5 text-primary" /> Заметки
                </h3>
                {isEditing ? (
                  <Textarea value={formData.notes as string}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    className="min-h-[100px] bg-background border-border text-sm"
                    placeholder="Особенности клиента, условия работы..." />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed p-3 bg-background/50 rounded-sm border border-border/50 min-h-[72px]">
                    {client.notes || <span className="text-muted-foreground italic">Заметок пока нет.</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4 md:col-span-1">
            {/* Объём заказов */}
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-4 md:p-6 flex flex-col items-center text-center gap-2">
                <p className="text-sm text-muted-foreground">Объем заказов</p>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input type="number" value={formData.orderVolume as number}
                      onChange={(e) => handleChange("orderVolume", Number(e.target.value))}
                      className="h-10 text-center font-bold text-lg bg-background border-border w-36" />
                    <span className="font-bold text-lg">₽</span>
                  </div>
                ) : (
                  <p className="text-2xl md:text-3xl font-display font-bold text-primary">
                    {formatCurrency(client.orderVolume)}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Контакт */}
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-base font-display font-semibold flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-primary" /> Контакт
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ФИО</p>
                    {isEditing ? (
                      <Input value={formData.contactName as string}
                        onChange={(e) => handleChange("contactName", e.target.value)}
                        className="h-8 bg-background border-border text-sm" />
                    ) : (
                      <p className="font-medium text-sm">{client.contactName || <span className="text-muted-foreground italic">Не указано</span>}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-primary" /> Телефон
                    </p>
                    {isEditing ? (
                      <Input value={formData.phone as string}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="h-8 bg-background border-border text-sm" />
                    ) : client.phone ? (
                      <a href={`tel:${client.phone}`}
                        className="font-medium text-sm text-primary hover:underline">{client.phone}</a>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Не указан</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-primary" /> Email
                    </p>
                    {isEditing ? (
                      <Input value={formData.email as string}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="h-8 bg-background border-border text-sm" />
                    ) : client.email ? (
                      <a href={`mailto:${client.email}`}
                        className="font-medium text-sm text-primary hover:underline break-all">{client.email}</a>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Не указан</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Быстрые ссылки на соцсети (только если есть, только просмотр) */}
            {!isEditing && hasSocials && (
              <Card className="bg-card border-border shadow-none rounded-sm">
                <CardContent className="p-4">
                  <h3 className="text-xs font-medium text-muted-foreground mb-3">БЫСТРЫЕ ССЫЛКИ</h3>
                  <div className="flex flex-wrap gap-2">
                    {client.instagram && (
                      <a href={client.instagram.startsWith("http") ? client.instagram : `https://instagram.com/${client.instagram.replace("@","")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary hover:text-primary transition-colors text-xs">
                        <Instagram className="h-3.5 w-3.5" /> Instagram
                      </a>
                    )}
                    {client.vk && (
                      <a href={client.vk.startsWith("http") ? client.vk : `https://vk.com/${client.vk.replace("@","")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary hover:text-primary transition-colors text-xs">
                        <VkIcon /> ВКонтакте
                      </a>
                    )}
                    {client.telegram && (
                      <a href={client.telegram.startsWith("http") ? client.telegram : `https://t.me/${client.telegram.replace("@","")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary hover:text-primary transition-colors text-xs">
                        <Send className="h-3.5 w-3.5" /> Telegram
                      </a>
                    )}
                    {client.whatsapp && (
                      <a href={`https://wa.me/${client.whatsapp.replace(/\D/g,"")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary hover:text-primary transition-colors text-xs">
                        <WhatsAppIcon /> WhatsApp
                      </a>
                    )}
                    {client.website && (
                      <a href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary hover:text-primary transition-colors text-xs">
                        <Globe className="h-3.5 w-3.5" /> Сайт
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
