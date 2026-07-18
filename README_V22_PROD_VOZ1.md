# ControlEvent v22_prod · VOZ1

Base: `v22_prod_fix8`.

Esta versión congela la lógica de inteligencia de Zuzu y añade una capa de voz independiente.

## Funciones añadidas

- Botón **🎙️ Hablar** dentro de la ventana de Zuzu.
- El micrófono permanece abierto hasta pulsar **Detener micro**.
- Transcripción provisional y definitiva en español dentro del campo de la pregunta.
- La pregunta no se envía automáticamente: queda visible para revisarla.
- Lectura por altavoz de la respuesta principal de Zuzu.
- Controles **Leer, Pausa, Continuar y Detener**.
- Opción recordada **Leer respuesta automáticamente**, activada inicialmente.
- Selección de voz española disponible en el dispositivo.
- Velocidad lenta, normal o rápida.
- Mientras Zuzu habla, el micrófono se cierra para evitar que escuche su propia voz.
- Al cerrar Zuzu se detienen micrófono y altavoz.

## Compatibilidad

El dictado utiliza `SpeechRecognition` / `webkitSpeechRecognition`, disponible principalmente en Chrome y Edge. Cuando un navegador no ofrece esa función, ControlEvent lo indica y el usuario puede usar el micrófono del teclado del dispositivo.

La lectura utiliza `speechSynthesis`, normalmente disponible en Chrome, Edge, Safari, iPhone, iPad y Android. Las voces concretas dependen del dispositivo.

## Privacidad y seguridad

ControlEvent no abre el micrófono de forma automática. Solo se activa tras una pulsación explícita y muestra un botón rojo mientras está escuchando. Esta versión no añade almacenamiento de audio ni modifica el backend.

## Archivos modificados

- `public/app/features/v22-voz1-zuzu.js`
- `app/features/v22-voz1-zuzu.js`
- `public/index.html`
- `index.html`
- `public/app/features/v17-fix27-welcome-info-general.js`
- `app/features/v17-fix27-welcome-info-general.js`
