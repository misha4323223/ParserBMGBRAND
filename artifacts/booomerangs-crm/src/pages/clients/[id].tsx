import { AppLayout } from "@/components/layout/app-layout";
import { useGetClient, useUpdateClient, useDeleteClient, getListClientsQueryKey, getGetClientQueryKey, getGetClientsStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useLocation, Link, useParams } from "wouter";
import { ArrowLeft, Loader2, Building2, User, MapPin, Phone, Mail, Tag, Calendar, MessageSquare, Trash2, Edit, Save, X, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: client, isLoading, isError } = useGetClient(clientId, {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) }
  });

  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [formData, setFormData] = useState<any>({});

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
      { id: clientId, data: formData },
      {
        onSuccess: (updatedData) => {
          queryClient.setQueryData(getGetClientQueryKey(clientId), updatedData);
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetClientsStatsQueryKey() });
          setIsEditing(false);
          toast({
            title: "Изменения сохранены",
            description: "Данные клиента успешно обновлены.",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Ошибка",
            description: "Не удалось сохранить изменения.",
          });
        }
      }
    );
  };

  const handleDelete = () => {
    deleteClient.mutate(
      { id: clientId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetClientsStatsQueryKey() });
          toast({
            title: "Клиент удален",
            description: "Клиент успешно удален из базы.",
          });
          setLocation("/clients");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Ошибка",
            description: "Не удалось удалить клиента.",
          });
        }
      }
    );
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
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
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-xl font-display font-semibold">Клиент не найден</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Возможно, клиент был удален или вы перешли по неверной ссылке.
          </p>
          <Button onClick={() => setLocation("/clients")} className="mt-4">
            Вернуться к списку
          </Button>
        </div>
      </AppLayout>
    );
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "0 ₽";
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'prospect': return 'Потенциальный';
      case 'inactive': return 'Неактивный';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'prospect': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'inactive': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full max-w-5xl mx-auto pb-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setLocation("/clients")} className="border-border text-foreground hover:bg-accent/10 hover:text-accent shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-3 flex-wrap">
                {isEditing ? (
                  <Input 
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="text-2xl font-display font-bold h-10 w-64 bg-background border-border"
                  />
                ) : (
                  <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">{client.companyName}</h1>
                )}
                
                {isEditing ? (
                  <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                    <SelectTrigger className="w-[160px] h-8 bg-background border-border">
                      <SelectValue placeholder="Статус" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активный</SelectItem>
                      <SelectItem value="prospect">Потенциальный</SelectItem>
                      <SelectItem value="inactive">Неактивный</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={`rounded-sm border font-medium px-3 py-1 ${getStatusColor(client.status)}`}>
                    {getStatusLabel(client.status)}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3" /> Добавлен {new Date(client.createdAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
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
                  }}
                  className="gap-2 border-border"
                >
                  <X className="h-4 w-4" /> Отмена
                </Button>
                <Button onClick={handleSave} disabled={updateClient.isPending} className="gap-2">
                  {updateClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                  Сохранить
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit className="h-4 w-4" /> Редактировать
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                      <Trash2 className="h-4 w-4" /> Удалить
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display">Удалить клиента?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Это действие необратимо. Клиент "{client.companyName}" будет удален из базы данных BOOOMERANGS навсегда.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-border">Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-6 md:col-span-2">
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-display font-semibold flex items-center gap-2 mb-6">
                  <Building2 className="h-5 w-5 text-primary" /> Профиль компании
                </h3>
                
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Город
                    </p>
                    {isEditing ? (
                      <Input 
                        value={formData.city} 
                        onChange={(e) => handleChange('city', e.target.value)}
                        className="h-8 bg-background border-border"
                      />
                    ) : (
                      <p className="font-medium">{client.city || "Не указан"}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Регион
                    </p>
                    {isEditing ? (
                      <Input 
                        value={formData.region} 
                        onChange={(e) => handleChange('region', e.target.value)}
                        className="h-8 bg-background border-border"
                      />
                    ) : (
                      <p className="font-medium">{client.region || "Не указан"}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Tag className="h-4 w-4" /> Категория
                    </p>
                    {isEditing ? (
                      <Input 
                        value={formData.category} 
                        onChange={(e) => handleChange('category', e.target.value)}
                        className="h-8 bg-background border-border"
                      />
                    ) : (
                      <p className="font-medium">{client.category || "Не указана"}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Последний заказ
                    </p>
                    <p className="font-medium">{client.lastOrderDate ? new Date(client.lastOrderDate).toLocaleDateString('ru-RU') : "Нет данных"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-display font-semibold flex items-center gap-2 mb-6">
                  <MessageSquare className="h-5 w-5 text-primary" /> Заметки
                </h3>
                {isEditing ? (
                  <Textarea 
                    value={formData.notes} 
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="min-h-[150px] bg-background border-border"
                    placeholder="Добавьте заметки..."
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-background/50 rounded-sm border border-border/50 min-h-[100px]">
                    {client.notes || <span className="text-muted-foreground italic">Заметок пока нет.</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6 md:col-span-1">
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-display font-semibold flex items-center gap-2 mb-6">
                  <User className="h-5 w-5 text-primary" /> Контактное лицо
                </h3>
                
                <div className="flex flex-col gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">ФИО</p>
                    {isEditing ? (
                      <Input 
                        value={formData.contactName} 
                        onChange={(e) => handleChange('contactName', e.target.value)}
                        className="h-8 bg-background border-border"
                      />
                    ) : (
                      <p className="font-medium">{client.contactName || "Не указано"}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" /> Телефон
                    </p>
                    {isEditing ? (
                      <Input 
                        value={formData.phone} 
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="h-8 bg-background border-border"
                      />
                    ) : (
                      <p className="font-medium">{client.phone || "Не указан"}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" /> Email
                    </p>
                    {isEditing ? (
                      <Input 
                        value={formData.email} 
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="h-8 bg-background border-border"
                      />
                    ) : (
                      <p className="font-medium">{client.email || "Не указан"}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-none rounded-sm bg-gradient-to-b from-card to-background">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center gap-2 py-4">
                  <p className="text-sm text-muted-foreground">Объем заказов</p>
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full max-w-[200px]">
                      <Input 
                        type="number"
                        value={formData.orderVolume} 
                        onChange={(e) => handleChange('orderVolume', Number(e.target.value))}
                        className="h-10 text-center font-display font-bold text-xl bg-background border-border"
                      />
                      <span className="font-display font-bold text-xl">₽</span>
                    </div>
                  ) : (
                    <p className="text-3xl font-display font-bold text-primary">{formatCurrency(client.orderVolume)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
