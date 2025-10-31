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
            Context context = getReactApplicationContext();
            ContentResolver cr = context.getContentResolver();
            
            // Buscar o primeiro calendário disponível
            String[] projection = new String[]{
                CalendarContract.Calendars._ID,
                CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
                CalendarContract.Calendars.OWNER_ACCOUNT
            };
            
            Cursor cursor = cr.query(
                CalendarContract.Calendars.CONTENT_URI,
                projection,
                CalendarContract.Calendars.VISIBLE + " = 1",
                null,
                null
            );
            
            long calendarId = -1;
            if (cursor != null && cursor.moveToFirst()) {
                int columnIndex = cursor.getColumnIndex(CalendarContract.Calendars._ID);
                if (columnIndex >= 0) {
                    calendarId = cursor.getLong(columnIndex);
                }
                cursor.close();
            }
            
            if (calendarId == -1) {
                promise.reject("NO_CALENDAR", "Nenhum calendário encontrado");
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
                createReminder(cr, eventId);
                promise.resolve(true);
            } else {
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