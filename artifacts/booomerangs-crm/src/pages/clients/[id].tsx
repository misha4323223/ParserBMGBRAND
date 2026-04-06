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
  ArrowLeft,
  Loader2,
  Building2,
  User,
  MapPin,
  Phone,
  Mail,
  Tag,
  Calendar,
  MessageSquare,
  Trash2,
  Edit,
  Save,
  X,
  AlertTriangle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      });
    }
  }, [client]);

  const handleSave = () => {
    updateClient.mutate(
      { id: clientId, data: formData as never },
      {
        onSuccess: (updatedData) => {
          queryClient.setQueryData(getGetClientQueryKey(clientId), updatedData);
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
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteClient.mutate(
      { id: clientId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetClientsStatsQueryKey() });
          toast({ title: "Клиент удален", description: "Клиент успешно удален из базы." });
          setLocation("/clients");
        },
        onError: () => {
          toast({ variant: "destructive", title: "Ошибка", description: "Не удалось удалить клиента." });
        },
      }
    );
  };

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Активный";
      case "prospect": return "Потенциальный";
      case "inactive": return "Неактивный";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "prospect": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "inactive": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "0 ₽";
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Загрузка профиля...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError || !client) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-xl font-display font-semibold">Клиент не найден</h2>
          <Button onClick={() => setLocation("/clients")}>Вернуться к списку</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 md:gap-6 max-w-5xl mx-auto pb-4">
        {/* Back button */}
        <button
          onClick={() => setLocation("/clients")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>

        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              {isEditing ? (
                <Input
                  value={formData.companyName as string}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  className="text-xl font-bold bg-background border-border"
                />
              ) : (
                <h1 className="text-xl md:text-3xl font-display font-bold tracking-tight text-foreground break-words">
                  {client.companyName}
                </h1>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {isEditing ? (
                  <Select
                    value={formData.status as string}
                    onValueChange={(val) => handleChange("status", val)}
                  >
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
                  <Badge
                    variant="outline"
                    className={`rounded-sm border font-medium px-3 py-0.5 ${getStatusColor(client.status)}`}
                  >
                    {getStatusLabel(client.status)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(client.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={resetForm} className="gap-1.5 border-border">
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Отмена</span>
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateClient.isPending} className="gap-1.5">
                    {updateClient.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Сохранить</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                    <Edit className="h-4 w-4" />
                    <span className="hidden sm:inline">Редактировать</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Удалить</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border mx-4">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-display">Удалить клиента?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие необратимо. Клиент "{client.companyName}" будет удален из базы BOOOMERANGS навсегда.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">Отмена</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
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
          {/* Left column */}
          <div className="flex flex-col gap-4 md:gap-6 md:col-span-2">
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-base md:text-lg font-display font-semibold flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-primary" /> Профиль компании
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> Город
                    </p>
                    {isEditing ? (
                      <Input
                        value={formData.city as string}
                        onChange={(e) => handleChange("city", e.target.value)}
                        className="h-8 bg-background border-border text-sm"
                      />
                    ) : (
                      <p className="font-medium text-sm">{client.city || "Не указан"}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> Регион
                    </p>
                    {isEditing ? (
                      <Input
                        value={formData.region as string}
                        onChange={(e) => handleChange("region", e.target.value)}
                        className="h-8 bg-background border-border text-sm"
                      />
                    ) : (
                      <p className="font-medium text-sm">{client.region || "Не указан"}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> Категория
                    </p>
                    {isEditing ? (
                      <Input
                        value={formData.category as string}
                        onChange={(e) => handleChange("category", e.target.value)}
                        className="h-8 bg-background border-border text-sm"
                      />
                    ) : (
                      <p className="font-medium text-sm">{client.category || "Не указана"}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Последний заказ
                    </p>
                    <p className="font-medium text-sm">
                      {client.lastOrderDate
                        ? new Date(client.lastOrderDate).toLocaleDateString("ru-RU")
                        : "Нет данных"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-base font-display font-semibold flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5 text-primary" /> Заметки
                </h3>
                {isEditing ? (
                  <Textarea
                    value={formData.notes as string}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    className="min-h-[120px] bg-background border-border text-sm"
                    placeholder="Добавьте заметки..."
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed p-3 bg-background/50 rounded-sm border border-border/50 min-h-[80px]">
                    {client.notes || (
                      <span className="text-muted-foreground italic">Заметок пока нет.</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4 md:gap-6 md:col-span-1">
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-base font-display font-semibold flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-primary" /> Контакт
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ФИО</p>
                    {isEditing ? (
                      <Input
                        value={formData.contactName as string}
                        onChange={(e) => handleChange("contactName", e.target.value)}
                        className="h-8 bg-background border-border text-sm"
                      />
                    ) : (
                      <p className="font-medium text-sm">{client.contactName || "Не указано"}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-primary" /> Телефон
                    </p>
                    {isEditing ? (
                      <Input
                        value={formData.phone as string}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="h-8 bg-background border-border text-sm"
                      />
                    ) : client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        className="font-medium text-sm text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {client.phone}
                      </a>
                    ) : (
                      <p className="font-medium text-sm">Не указан</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-primary" /> Email
                    </p>
                    {isEditing ? (
                      <Input
                        value={formData.email as string}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="h-8 bg-background border-border text-sm"
                      />
                    ) : client.email ? (
                      <a
                        href={`mailto:${client.email}`}
                        className="font-medium text-sm text-primary hover:underline break-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {client.email}
                      </a>
                    ) : (
                      <p className="font-medium text-sm">Не указан</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center text-center gap-2">
                <p className="text-sm text-muted-foreground">Объем заказов</p>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.orderVolume as number}
                      onChange={(e) => handleChange("orderVolume", Number(e.target.value))}
                      className="h-10 text-center font-bold text-lg bg-background border-border w-36"
                    />
                    <span className="font-bold text-lg">₽</span>
                  </div>
                ) : (
                  <p className="text-2xl md:text-3xl font-display font-bold text-primary">
                    {formatCurrency(client.orderVolume)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
