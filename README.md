# CBDEVS Client Portal

Portal privado para clientes de CBDEVS. Permite revisar el progreso del proyecto, hitos, entregables, pagos y mensajes vinculados a una cuenta de Firebase Auth.

## Stack

- Next.js 15
- React 19
- Tailwind CSS
- Firebase Auth + Firestore

## Desarrollo

```bash
npm install
npm run dev
```

Copia `.env.example` a `.env.local` y agrega la configuracion publica de Firebase.

## Modelo de datos

El portal lee proyectos desde `projects` usando:

- `clientUid`: UID del cliente en Firebase Auth.
- `clientEmail`: correo del cliente como respaldo.

Los mensajes usan `messages` con:

- `channelId`: `project:{projectId}`
- `projectId`
- `senderId`
- `senderName`
- `text`
- `createdAt`

Los pagos leen `payments` filtrando por `metadata.clientUid`.

## Admin

El dashboard admin `CBDEVS_ADMIN` crea usuarios con rol `cliente` y permite capturar `clientUid` / `clientEmail` en proyectos. Las reglas de Firestore incluidas limitan a cada cliente a sus propios proyectos, pagos y mensajes.
