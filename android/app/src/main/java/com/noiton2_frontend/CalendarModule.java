package com.noiton2_frontend;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import java.util.Calendar;
import java.util.TimeZone;

public class CalendarModule extends ReactContextBaseJavaModule {
    
    private static ReactApplicationContext reactContext;
    
    public CalendarModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }
    
    @Override
    public String getName() {
        return "CalendarModule";
    }
    
    @ReactMethod
    public void createEvent(String title, String description, double startTime, double endTime, String location, Promise promise) {
        try {
            android.util.Log.d("CalendarModule", "🔍 DEBUG: Iniciando createEvent");
            android.util.Log.d("CalendarModule", "📝 Title: " + title);
            android.util.Log.d("CalendarModule", "📝 Description: " + description.substring(0, Math.min(50, description.length())));
            android.util.Log.d("CalendarModule", "📝 StartTime: " + new java.util.Date((long)startTime).toString());
            android.util.Log.d("CalendarModule", "📝 EndTime: " + new java.util.Date((long)endTime).toString());
            
            Context context = getReactApplicationContext();
            ContentResolver cr = context.getContentResolver();
            
            // Buscar o primeiro calendário disponível
            String[] projection = new String[]{
                CalendarContract.Calendars._ID,
                CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
                CalendarContract.Calendars.OWNER_ACCOUNT
            };
            
            // Buscar calendário pessoal do Google (evitar calendários somente leitura)
            String[] fullProjection = new String[]{
                CalendarContract.Calendars._ID,
                CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
                CalendarContract.Calendars.OWNER_ACCOUNT,
                CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL,
                CalendarContract.Calendars.ACCOUNT_TYPE
            };
            
            Cursor cursor = cr.query(
                CalendarContract.Calendars.CONTENT_URI,
                fullProjection,
                CalendarContract.Calendars.VISIBLE + " = 1 AND " + 
                CalendarContract.Calendars.SYNC_EVENTS + " = 1 AND " +
                CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL + " >= " + CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR + " AND (" +
                CalendarContract.Calendars.ACCOUNT_TYPE + " = 'com.google' OR " +
                CalendarContract.Calendars.OWNER_ACCOUNT + " LIKE '%@gmail.com') AND " +
                CalendarContract.Calendars.OWNER_ACCOUNT + " NOT LIKE '%#holiday@%'",
                null,
                CalendarContract.Calendars.IS_PRIMARY + " DESC"
            );
            
            android.util.Log.d("CalendarModule", "🔍 Buscando calendário do Google primeiro...");
            
            long calendarId = -1;
            String selectedCalendarName = "";
            String selectedAccount = "";
            
            // Listar todos os calendários encontrados
            if (cursor != null && cursor.getCount() > 0) {
                android.util.Log.d("CalendarModule", "📋 Total de calendários do Google encontrados: " + cursor.getCount());
                
                while (cursor.moveToNext()) {
                    int idIndex = cursor.getColumnIndex(CalendarContract.Calendars._ID);
                    int nameIndex = cursor.getColumnIndex(CalendarContract.Calendars.CALENDAR_DISPLAY_NAME);
                    int accountIndex = cursor.getColumnIndex(CalendarContract.Calendars.OWNER_ACCOUNT);
                    int accessIndex = cursor.getColumnIndex(CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL);
                    int typeIndex = cursor.getColumnIndex(CalendarContract.Calendars.ACCOUNT_TYPE);
                    
                    if (idIndex >= 0) {
                        long currentId = cursor.getLong(idIndex);
                        String calendarName = nameIndex >= 0 ? cursor.getString(nameIndex) : "Desconhecido";
                        String account = accountIndex >= 0 ? cursor.getString(accountIndex) : "Desconhecido";
                        int accessLevel = accessIndex >= 0 ? cursor.getInt(accessIndex) : 0;
                        String accountType = typeIndex >= 0 ? cursor.getString(typeIndex) : "Desconhecido";
                        
                        android.util.Log.d("CalendarModule", "📅 Calendário " + (cursor.getPosition() + 1) + ":");
                        android.util.Log.d("CalendarModule", "   ID: " + currentId);
                        android.util.Log.d("CalendarModule", "   Nome: " + calendarName);
                        android.util.Log.d("CalendarModule", "   Conta: " + account);
                        android.util.Log.d("CalendarModule", "   Acesso: " + accessLevel + " (mín. " + CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR + ")");
                        android.util.Log.d("CalendarModule", "   Tipo: " + accountType);
                        
                        // Selecionar o primeiro calendário editável encontrado
                        if (calendarId == -1 && accessLevel >= CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR) {
                            calendarId = currentId;
                            selectedCalendarName = calendarName;
                            selectedAccount = account;
                            android.util.Log.d("CalendarModule", "✅ Calendário selecionado (editável)!");
                        }
                    }
                }
                cursor.close();
                
                if (calendarId != -1) {
                    android.util.Log.d("CalendarModule", "✅ Calendário selecionado:");
                    android.util.Log.d("CalendarModule", "   ID: " + calendarId);
                    android.util.Log.d("CalendarModule", "   Nome: " + selectedCalendarName);
                    android.util.Log.d("CalendarModule", "   Conta: " + selectedAccount);
                }
            }
            
            // Se não encontrou calendário do Google, buscar qualquer calendário sincronizável
            if (calendarId == -1) {
                android.util.Log.d("CalendarModule", "⚠️ Calendário do Google não encontrado, buscando qualquer calendário...");
                
                Cursor fallbackCursor = cr.query(
                    CalendarContract.Calendars.CONTENT_URI,
                    fullProjection,
                    CalendarContract.Calendars.VISIBLE + " = 1 AND " + 
                    CalendarContract.Calendars.SYNC_EVENTS + " = 1 AND " +
                    CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL + " >= " + CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR,
                    null,
                    null
                );
                
                if (fallbackCursor != null && fallbackCursor.moveToFirst()) {
                    int idIndex = fallbackCursor.getColumnIndex(CalendarContract.Calendars._ID);
                    int nameIndex = fallbackCursor.getColumnIndex(CalendarContract.Calendars.CALENDAR_DISPLAY_NAME);
                    int accountIndex = fallbackCursor.getColumnIndex(CalendarContract.Calendars.OWNER_ACCOUNT);
                    
                    if (idIndex >= 0) {
                        calendarId = fallbackCursor.getLong(idIndex);
                        selectedCalendarName = nameIndex >= 0 ? fallbackCursor.getString(nameIndex) : "Desconhecido";
                        selectedAccount = accountIndex >= 0 ? fallbackCursor.getString(accountIndex) : "Desconhecido";
                        
                        android.util.Log.d("CalendarModule", "📅 Calendário fallback selecionado:");
                        android.util.Log.d("CalendarModule", "   ID: " + calendarId);
                        android.util.Log.d("CalendarModule", "   Nome: " + selectedCalendarName);
                        android.util.Log.d("CalendarModule", "   Conta: " + selectedAccount);
                    }
                    fallbackCursor.close();
                }
            }
            
            if (calendarId == -1) {
                android.util.Log.e("CalendarModule", "❌ Nenhum calendário encontrado");
                promise.reject("NO_CALENDAR", "Nenhum calendário encontrado - verifique se há contas Google configuradas");
                return;
            }
            
            // Criar o evento
            ContentValues values = new ContentValues();
            values.put(CalendarContract.Events.DTSTART, (long)startTime);
            values.put(CalendarContract.Events.DTEND, (long)endTime);
            values.put(CalendarContract.Events.TITLE, title);
            values.put(CalendarContract.Events.DESCRIPTION, description);
            values.put(CalendarContract.Events.CALENDAR_ID, calendarId);
            values.put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().getID());
            
            if (location != null && !location.isEmpty()) {
                values.put(CalendarContract.Events.EVENT_LOCATION, location);
            }
            
            Uri uri = cr.insert(CalendarContract.Events.CONTENT_URI, values);
            
            if (uri != null) {
                // Criar lembrete
                long eventId = Long.parseLong(uri.getLastPathSegment());
                android.util.Log.d("CalendarModule", "✅ Evento criado com ID: " + eventId);
                createReminder(cr, eventId);
                android.util.Log.d("CalendarModule", "✅ Evento e lembrete criados com sucesso");
                promise.resolve(true);
            } else {
                android.util.Log.e("CalendarModule", "❌ Falha ao inserir evento no calendário");
                promise.reject("INSERT_ERROR", "Erro ao inserir evento no calendário");
            }
            
        } catch (SecurityException e) {
            promise.reject("PERMISSION_DENIED", "Permissão negada para acessar o calendário");
        } catch (Exception e) {
            promise.reject("ERROR", "Erro ao criar evento: " + e.getMessage());
        }
    }
    
    @ReactMethod
    public void openCalendarApp(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_APP_CALENDAR);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            if (intent.resolveActivity(context.getPackageManager()) != null) {
                context.startActivity(intent);
                promise.resolve(true);
            } else {
                // Fallback para o Google Calendar
                intent = context.getPackageManager().getLaunchIntentForPackage("com.google.android.calendar");
                if (intent != null) {
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    promise.resolve(true);
                } else {
                    promise.reject("NO_APP", "Nenhum app de calendário encontrado");
                }
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Erro ao abrir app de calendário: " + e.getMessage());
        }
    }
    
    private void createReminder(ContentResolver cr, long eventId) {
        try {
            ContentValues reminderValues = new ContentValues();
            reminderValues.put(CalendarContract.Reminders.MINUTES, 60); // 1 hora antes
            reminderValues.put(CalendarContract.Reminders.EVENT_ID, eventId);
            reminderValues.put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT);
            
            cr.insert(CalendarContract.Reminders.CONTENT_URI, reminderValues);
        } catch (Exception e) {
            // Ignorar erros de lembrete
        }
    }
}