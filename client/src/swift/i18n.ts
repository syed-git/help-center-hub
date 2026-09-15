import type { OptionId, ResponseId } from './botFlow'

export type Lang = 'en' | 'es' | 'fr' | 'zh' | 'de'

export const LANGUAGES: { code: Lang; label: string; native: string; locale: string }[] = [
  { code: 'en', label: 'English', native: 'English', locale: 'en-US' },
  { code: 'es', label: 'Spanish', native: 'Español', locale: 'es-ES' },
  { code: 'fr', label: 'French', native: 'Français', locale: 'fr-FR' },
  { code: 'zh', label: 'Chinese', native: '中文', locale: 'zh-CN' },
  { code: 'de', label: 'German', native: 'Deutsch', locale: 'de-DE' },
]

export const DEFAULT_LANG: Lang = 'en'
export const isLang = (v: string | null | undefined): v is Lang => LANGUAGES.some((l) => l.code === v)
export const languageName = (code: string) => LANGUAGES.find((l) => l.code === code)?.label ?? code

type SystemKey = 'routing_notice' | 'connected' | 'transferring' | 'agent_disconnected' | 'ended_by_agent' | 'ended_by_user' | 'left_queue' | 'transfer_failed'

export interface Strings {
  botName: string
  greeting: (firstName: string) => string
  mainMenuPrompt: string
  subMenuPrompt: string
  postPrompt: string
  options: Record<OptionId, string>
  ratings: string[]
  responses: Record<ResponseId, { text: string; linkLabel?: string }>
  existingPaymentPrompt: string
  existingPaymentResponse: (reference: string, date: string) => string
  invalidReference: string
  referenceGiveUp: string
  fallback: string
  pickRating: string
  surveyRating: string
  surveyFeedback: string
  surveyThanks: string
  routingNotice: string
  queuePosition: (position: number, minutes: number) => string
  noAgents: string
  botEnded: string
  userEnded: string
  waitForAgent: string
  tooLong: string
  system: Record<SystemKey, (p: Record<string, string>) => string>
  intents: Record<'agent' | 'payments' | 'reports' | 'entitlements' | 'claims' | 'somethingElse', RegExp>
  ui: {
    title: string
    chatMenu: string
    endConversation: string
    downloadTranscript: string
    minimize: string
    availableAfterEnd: string
    startNewChat: string
    typeMessage: string
    waitingForAgent: string
    conversationEnded: string
    delivered: string
    connectionLost: string
    isTyping: string
    transcriptTitle: string
    privacy: string
    terms: string
  }
}

const en: Strings = {
  botName: 'Swift Assistant',
  greeting: (n) => `Hi, ${n}. I'm the Swift Payments Assistant!`,
  mainMenuPrompt: 'Please select an option below or tell me in a few words what you need help with.',
  subMenuPrompt: 'Choose from one of the options below:',
  postPrompt: 'Can I help you with anything else?',
  options: {
    payments: 'Payments',
    reports: 'Reports or Statements',
    entitlements: 'User Entitlements or Access',
    claims: 'Claims',
    something_else: 'Help with something else',
    existing_payment: 'Existing Payments',
    new_payment: 'New Payments',
    yes: 'Yes',
    no: 'No',
    chat_with_agent: 'Chat With Agent',
    download_report: 'Download Report',
    verify_report: 'Verify Report',
    create_template: 'Create Report Template',
    schedule_report: 'Schedule Report',
    unlock_user: 'Unlock User',
    forgot_password: 'Forgot Password',
    mobile_token: 'Mobile Token',
    view_claims: 'View Your Previous Claims',
    new_claim: 'Start a New Claim',
    update_claim: 'Update a Claim',
  },
  ratings: ['1 - Poor', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Excellent'],
  responses: {
    new_payment: { text: 'Learn how to make a payment with our Make a Payment guide.', linkLabel: 'Make a Payment' },
    download_report: {
      text: 'You can download account statements and reports from Reports > Report Center. Select the account, date range and format (PDF, CSV or XLSX), then click Download. Reports for the last 24 months are available instantly.',
    },
    verify_report: {
      text: 'To verify a report, open Reports > Report Center, locate the report and click Verify. Swift Payments checks the digital signature and confirms that the report has not been altered since it was generated.',
    },
    create_template: {
      text: 'Report templates let you save your favourite filters. Go to Reports > Templates > Create Template, choose the accounts, columns and schedule, then save it. Templates can be shared with other users in your organisation.',
    },
    schedule_report: {
      text: 'Scheduled reports are delivered automatically to your inbox. Go to Reports > Schedules > New Schedule, pick a template, frequency (daily, weekly or monthly) and delivery channel.',
    },
    unlock_user: {
      text: 'A Security Manager can unlock a user from Administration > Users > select the user > Unlock. If you are the only Security Manager, please use the Chat With Agent option and we will verify your identity to unlock your access.',
    },
    forgot_password: {
      text: 'Click Forgot Password on the login page, enter your user ID and follow the one-time passcode sent to your registered email or mobile number. New passwords must be 12+ characters with a mix of letters, numbers and symbols.',
    },
    mobile_token: {
      text: 'To activate the Swift Payments mobile token, install the Swift Authenticator app, choose Activate Token and scan the QR code shown under Profile > Security > Mobile Token. Tokens expire after 90 days of inactivity.',
    },
    view_claims: {
      text: 'Your previous claims are listed under Services > Claims > Claim History. You can filter by status (Open, In Review, Settled, Rejected) and download the outcome letter for each claim.',
    },
    new_claim: {
      text: 'To start a new claim go to Services > Claims > New Claim, select the transaction you are disputing, choose a reason and attach supporting documents. You will receive a claim reference within a few minutes.',
    },
    update_claim: {
      text: 'Open Services > Claims > Claim History, select the claim and click Update to add documents or comments. Claims can be updated while they are in Open or In Review status.',
    },
  },
  existingPaymentPrompt: 'Please enter the reference number',
  existingPaymentResponse: (ref, date) =>
    `Payment ${ref} was processed on ${date} and is currently in Completed status. Funds normally reflect in the beneficiary account within 1-2 business days. You can view the payment advice under Payments > Payment History.`,
  invalidReference: "That doesn't look like a valid reference number. Please enter a 6-20 character alphanumeric reference (for example SP2026091401).",
  referenceGiveUp: "I'm having trouble locating that payment. Our agents can look it up for you.",
  fallback: "Sorry, I didn't quite get that. Please select one of the options below.",
  pickRating: 'Please pick one of the ratings below.',
  surveyRating: 'Before you go, how would you rate your experience today?',
  surveyFeedback: 'Thank you! Is there anything we could do better? Type your feedback below (or type "skip").',
  surveyThanks: 'Thank you for your feedback. Have a great day!',
  routingNotice:
    "Let me route you to a live agent who should be able to help. Please note that in some countries, agent support may only be available in English. To request support in your local language, notify the agent and they'll guide you on next steps.",
  queuePosition: (p, m) => `You are number ${p} in the queue. Your expected wait time is ${m} minute${m === 1 ? '' : 's'}.`,
  noAgents: 'No agents are available at the moment. Please try again later.',
  botEnded: 'The conversation has ended. You can download the transcript from the menu.',
  userEnded: 'You have ended the conversation. You can download the transcript from the menu.',
  waitForAgent: 'Please wait until an agent joins the conversation.',
  tooLong: 'Message is too long (max 2000 characters).',
  system: {
    routing_notice: () => en.routingNotice,
    connected: ({ agentName }) => `You're connected with ${agentName}. Thanks for your patience.`,
    transferring: () => 'This conversation is being transferred to another agent.',
    agent_disconnected: () => 'Agent disconnected, this conversation is being requeued on priority.',
    ended_by_agent: ({ agentName }) => `${agentName} has ended the conversation. Thank you for contacting Swift Payments.`,
    ended_by_user: () => 'You have ended the conversation. Thank you for contacting Swift Payments.',
    left_queue: () => 'You left the queue. The conversation has ended.',
    transfer_failed: ({ agentName }) => `The transfer could not be completed. You're still connected with ${agentName}.`,
  },
  intents: {
    agent: /\b(agent|human|representative|person|someone)\b/,
    payments: /\b(pay|payment|payments|transfer|wire)\b/,
    reports: /\b(report|reports|statement|statements)\b/,
    entitlements: /\b(entitlement|entitlements|access|password|unlock|locked|token|login|log in)\b/,
    claims: /\b(claim|claims|dispute)\b/,
    somethingElse: /\b(help|else|other|something)\b/,
  },
  ui: {
    title: 'Chat with Us',
    chatMenu: 'Chat menu',
    endConversation: 'End conversation',
    downloadTranscript: 'Download transcript',
    minimize: 'Minimize',
    availableAfterEnd: 'Available after the conversation ends',
    startNewChat: 'Start a new chat',
    typeMessage: 'Type a message',
    waitingForAgent: 'Waiting for an agent to join...',
    conversationEnded: 'This conversation has ended',
    delivered: 'Delivered',
    connectionLost: 'Connection lost. Reconnecting...',
    isTyping: 'is typing',
    transcriptTitle: 'Swift Payments - Chat Transcript',
    privacy: 'Privacy',
    terms: 'Terms & Conditions',
  },
}

const es: Strings = {
  botName: 'Asistente Swift',
  greeting: (n) => `Hola, ${n}. ¡Soy el Asistente de Swift Payments!`,
  mainMenuPrompt: 'Seleccione una opción a continuación o cuénteme en pocas palabras en qué necesita ayuda.',
  subMenuPrompt: 'Elija una de las siguientes opciones:',
  postPrompt: '¿Puedo ayudarle con algo más?',
  options: {
    payments: 'Pagos',
    reports: 'Informes o Extractos',
    entitlements: 'Permisos de Usuario o Acceso',
    claims: 'Reclamaciones',
    something_else: 'Ayuda con otra cosa',
    existing_payment: 'Pagos Existentes',
    new_payment: 'Nuevos Pagos',
    yes: 'Sí',
    no: 'No',
    chat_with_agent: 'Chatear con un Agente',
    download_report: 'Descargar Informe',
    verify_report: 'Verificar Informe',
    create_template: 'Crear Plantilla de Informe',
    schedule_report: 'Programar Informe',
    unlock_user: 'Desbloquear Usuario',
    forgot_password: 'Olvidé mi Contraseña',
    mobile_token: 'Token Móvil',
    view_claims: 'Ver sus Reclamaciones Anteriores',
    new_claim: 'Iniciar una Nueva Reclamación',
    update_claim: 'Actualizar una Reclamación',
  },
  ratings: ['1 - Malo', '2 - Regular', '3 - Bueno', '4 - Muy Bueno', '5 - Excelente'],
  responses: {
    new_payment: { text: 'Aprenda a realizar un pago con nuestra guía Realizar un Pago.', linkLabel: 'Realizar un Pago' },
    download_report: {
      text: 'Puede descargar extractos e informes de cuenta desde Informes > Centro de Informes. Seleccione la cuenta, el rango de fechas y el formato (PDF, CSV o XLSX) y haga clic en Descargar. Los informes de los últimos 24 meses están disponibles al instante.',
    },
    verify_report: {
      text: 'Para verificar un informe, abra Informes > Centro de Informes, localice el informe y haga clic en Verificar. Swift Payments comprueba la firma digital y confirma que el informe no ha sido alterado desde su generación.',
    },
    create_template: {
      text: 'Las plantillas de informe le permiten guardar sus filtros favoritos. Vaya a Informes > Plantillas > Crear Plantilla, elija las cuentas, columnas y programación, y guárdela. Las plantillas se pueden compartir con otros usuarios de su organización.',
    },
    schedule_report: {
      text: 'Los informes programados se envían automáticamente a su bandeja de entrada. Vaya a Informes > Programaciones > Nueva Programación, elija una plantilla, la frecuencia (diaria, semanal o mensual) y el canal de entrega.',
    },
    unlock_user: {
      text: 'Un Administrador de Seguridad puede desbloquear un usuario desde Administración > Usuarios > seleccionar el usuario > Desbloquear. Si usted es el único Administrador de Seguridad, utilice la opción Chatear con un Agente y verificaremos su identidad para desbloquear su acceso.',
    },
    forgot_password: {
      text: 'Haga clic en Olvidé mi Contraseña en la página de inicio de sesión, introduzca su ID de usuario y siga el código de un solo uso enviado a su correo o móvil registrado. Las nuevas contraseñas deben tener más de 12 caracteres con letras, números y símbolos.',
    },
    mobile_token: {
      text: 'Para activar el token móvil de Swift Payments, instale la app Swift Authenticator, elija Activar Token y escanee el código QR que aparece en Perfil > Seguridad > Token Móvil. Los tokens caducan tras 90 días de inactividad.',
    },
    view_claims: {
      text: 'Sus reclamaciones anteriores aparecen en Servicios > Reclamaciones > Historial. Puede filtrar por estado (Abierta, En Revisión, Resuelta, Rechazada) y descargar la carta de resolución de cada reclamación.',
    },
    new_claim: {
      text: 'Para iniciar una nueva reclamación vaya a Servicios > Reclamaciones > Nueva Reclamación, seleccione la transacción en disputa, elija un motivo y adjunte documentos de apoyo. Recibirá una referencia de reclamación en unos minutos.',
    },
    update_claim: {
      text: 'Abra Servicios > Reclamaciones > Historial, seleccione la reclamación y haga clic en Actualizar para añadir documentos o comentarios. Las reclamaciones se pueden actualizar mientras estén Abiertas o En Revisión.',
    },
  },
  existingPaymentPrompt: 'Por favor, introduzca el número de referencia',
  existingPaymentResponse: (ref, date) =>
    `El pago ${ref} se procesó el ${date} y se encuentra en estado Completado. Los fondos suelen reflejarse en la cuenta del beneficiario en 1-2 días hábiles. Puede ver el comprobante en Pagos > Historial de Pagos.`,
  invalidReference: 'Eso no parece un número de referencia válido. Introduzca una referencia alfanumérica de 6 a 20 caracteres (por ejemplo SP2026091401).',
  referenceGiveUp: 'No consigo localizar ese pago. Nuestros agentes pueden buscarlo por usted.',
  fallback: 'Lo siento, no le he entendido bien. Seleccione una de las opciones a continuación.',
  pickRating: 'Por favor, elija una de las valoraciones a continuación.',
  surveyRating: 'Antes de irse, ¿cómo valoraría su experiencia de hoy?',
  surveyFeedback: '¡Gracias! ¿Hay algo que podamos mejorar? Escriba sus comentarios a continuación (o escriba "omitir").',
  surveyThanks: 'Gracias por sus comentarios. ¡Que tenga un buen día!',
  routingNotice:
    'Le voy a conectar con un agente que podrá ayudarle. Tenga en cuenta que en algunos países el soporte de agentes solo está disponible en inglés. Para solicitar soporte en su idioma, indíquelo al agente y le guiará en los siguientes pasos.',
  queuePosition: (p, m) => `Usted es el número ${p} en la cola. El tiempo de espera estimado es de ${m} minuto${m === 1 ? '' : 's'}.`,
  noAgents: 'No hay agentes disponibles en este momento. Por favor, inténtelo más tarde.',
  botEnded: 'La conversación ha finalizado. Puede descargar la transcripción desde el menú.',
  userEnded: 'Ha finalizado la conversación. Puede descargar la transcripción desde el menú.',
  waitForAgent: 'Espere hasta que un agente se una a la conversación.',
  tooLong: 'El mensaje es demasiado largo (máx. 2000 caracteres).',
  system: {
    routing_notice: () => es.routingNotice,
    connected: ({ agentName }) => `Está conectado con ${agentName}. Gracias por su paciencia.`,
    transferring: () => 'Esta conversación se está transfiriendo a otro agente.',
    agent_disconnected: () => 'El agente se ha desconectado; esta conversación se está reencolando con prioridad.',
    ended_by_agent: ({ agentName }) => `${agentName} ha finalizado la conversación. Gracias por contactar con Swift Payments.`,
    ended_by_user: () => 'Ha finalizado la conversación. Gracias por contactar con Swift Payments.',
    left_queue: () => 'Ha salido de la cola. La conversación ha finalizado.',
    transfer_failed: ({ agentName }) => `No se pudo completar la transferencia. Sigue conectado con ${agentName}.`,
  },
  intents: {
    agent: /\b(agente|humano|representante|persona|alguien)\b/,
    payments: /\b(pago|pagos|pagar|transferencia|giro)\b/,
    reports: /\b(informe|informes|extracto|extractos|reporte|reportes)\b/,
    entitlements: /\b(permiso|permisos|acceso|contraseña|desbloquear|bloqueado|token|usuario)\b/,
    claims: /\b(reclamación|reclamacion|reclamaciones|disputa)\b/,
    somethingElse: /\b(ayuda|otra|otro|algo)\b/,
  },
  ui: {
    title: 'Chatee con Nosotros',
    chatMenu: 'Menú del chat',
    endConversation: 'Finalizar conversación',
    downloadTranscript: 'Descargar transcripción',
    minimize: 'Minimizar',
    availableAfterEnd: 'Disponible cuando finalice la conversación',
    startNewChat: 'Iniciar un nuevo chat',
    typeMessage: 'Escriba un mensaje',
    waitingForAgent: 'Esperando a que se una un agente...',
    conversationEnded: 'Esta conversación ha finalizado',
    delivered: 'Entregado',
    connectionLost: 'Conexión perdida. Reconectando...',
    isTyping: 'está escribiendo',
    transcriptTitle: 'Swift Payments - Transcripción del Chat',
    privacy: 'Privacidad',
    terms: 'Términos y Condiciones',
  },
}

const fr: Strings = {
  botName: 'Assistant Swift',
  greeting: (n) => `Bonjour ${n}, je suis l'Assistant Swift Payments !`,
  mainMenuPrompt: "Veuillez sélectionner une option ci-dessous ou dites-moi en quelques mots ce dont vous avez besoin.",
  subMenuPrompt: 'Choisissez parmi les options ci-dessous :',
  postPrompt: "Puis-je vous aider pour autre chose ?",
  options: {
    payments: 'Paiements',
    reports: 'Rapports ou Relevés',
    entitlements: "Droits d'Utilisateur ou Accès",
    claims: 'Réclamations',
    something_else: "Aide pour autre chose",
    existing_payment: 'Paiements Existants',
    new_payment: 'Nouveaux Paiements',
    yes: 'Oui',
    no: 'Non',
    chat_with_agent: 'Discuter avec un Agent',
    download_report: 'Télécharger un Rapport',
    verify_report: 'Vérifier un Rapport',
    create_template: 'Créer un Modèle de Rapport',
    schedule_report: 'Planifier un Rapport',
    unlock_user: 'Déverrouiller un Utilisateur',
    forgot_password: 'Mot de Passe Oublié',
    mobile_token: 'Jeton Mobile',
    view_claims: 'Voir vos Réclamations Précédentes',
    new_claim: 'Démarrer une Nouvelle Réclamation',
    update_claim: 'Mettre à Jour une Réclamation',
  },
  ratings: ['1 - Mauvais', '2 - Passable', '3 - Bien', '4 - Très Bien', '5 - Excellent'],
  responses: {
    new_payment: { text: 'Découvrez comment effectuer un paiement avec notre guide Effectuer un Paiement.', linkLabel: 'Effectuer un Paiement' },
    download_report: {
      text: 'Vous pouvez télécharger vos relevés et rapports depuis Rapports > Centre de Rapports. Sélectionnez le compte, la période et le format (PDF, CSV ou XLSX), puis cliquez sur Télécharger. Les rapports des 24 derniers mois sont disponibles immédiatement.',
    },
    verify_report: {
      text: "Pour vérifier un rapport, ouvrez Rapports > Centre de Rapports, localisez le rapport et cliquez sur Vérifier. Swift Payments contrôle la signature numérique et confirme que le rapport n'a pas été modifié depuis sa génération.",
    },
    create_template: {
      text: "Les modèles de rapport vous permettent d'enregistrer vos filtres favoris. Allez dans Rapports > Modèles > Créer un Modèle, choisissez les comptes, colonnes et planification, puis enregistrez. Les modèles peuvent être partagés avec les autres utilisateurs de votre organisation.",
    },
    schedule_report: {
      text: 'Les rapports planifiés sont envoyés automatiquement dans votre boîte de réception. Allez dans Rapports > Planifications > Nouvelle Planification, choisissez un modèle, une fréquence (quotidienne, hebdomadaire ou mensuelle) et un canal de livraison.',
    },
    unlock_user: {
      text: "Un Responsable Sécurité peut déverrouiller un utilisateur depuis Administration > Utilisateurs > sélectionner l'utilisateur > Déverrouiller. Si vous êtes le seul Responsable Sécurité, utilisez l'option Discuter avec un Agent et nous vérifierons votre identité pour rétablir votre accès.",
    },
    forgot_password: {
      text: "Cliquez sur Mot de Passe Oublié sur la page de connexion, saisissez votre identifiant et suivez le code à usage unique envoyé à votre e-mail ou mobile enregistré. Les nouveaux mots de passe doivent contenir plus de 12 caractères avec lettres, chiffres et symboles.",
    },
    mobile_token: {
      text: "Pour activer le jeton mobile Swift Payments, installez l'application Swift Authenticator, choisissez Activer le Jeton et scannez le code QR affiché sous Profil > Sécurité > Jeton Mobile. Les jetons expirent après 90 jours d'inactivité.",
    },
    view_claims: {
      text: "Vos réclamations précédentes figurent sous Services > Réclamations > Historique. Vous pouvez filtrer par statut (Ouverte, En Cours d'Examen, Réglée, Rejetée) et télécharger la lettre de décision de chaque réclamation.",
    },
    new_claim: {
      text: 'Pour démarrer une nouvelle réclamation, allez dans Services > Réclamations > Nouvelle Réclamation, sélectionnez la transaction contestée, choisissez un motif et joignez les pièces justificatives. Vous recevrez une référence de réclamation en quelques minutes.',
    },
    update_claim: {
      text: "Ouvrez Services > Réclamations > Historique, sélectionnez la réclamation et cliquez sur Mettre à Jour pour ajouter des documents ou commentaires. Les réclamations peuvent être mises à jour tant qu'elles sont Ouvertes ou En Cours d'Examen.",
    },
  },
  existingPaymentPrompt: 'Veuillez saisir le numéro de référence',
  existingPaymentResponse: (ref, date) =>
    `Le paiement ${ref} a été traité le ${date} et est actuellement au statut Terminé. Les fonds apparaissent généralement sur le compte du bénéficiaire sous 1 à 2 jours ouvrés. Vous pouvez consulter l'avis de paiement sous Paiements > Historique des Paiements.`,
  invalidReference: "Cela ne ressemble pas à un numéro de référence valide. Veuillez saisir une référence alphanumérique de 6 à 20 caractères (par exemple SP2026091401).",
  referenceGiveUp: "Je n'arrive pas à localiser ce paiement. Nos agents peuvent le rechercher pour vous.",
  fallback: "Désolé, je n'ai pas bien compris. Veuillez sélectionner l'une des options ci-dessous.",
  pickRating: "Veuillez choisir l'une des notes ci-dessous.",
  surveyRating: "Avant de partir, comment évalueriez-vous votre expérience aujourd'hui ?",
  surveyFeedback: 'Merci ! Y a-t-il quelque chose que nous pourrions améliorer ? Saisissez vos commentaires ci-dessous (ou tapez « passer »).',
  surveyThanks: 'Merci pour vos commentaires. Bonne journée !',
  routingNotice:
    "Je vais vous mettre en relation avec un agent qui pourra vous aider. Veuillez noter que dans certains pays, l'assistance par agent n'est disponible qu'en anglais. Pour demander une assistance dans votre langue, indiquez-le à l'agent qui vous guidera.",
  queuePosition: (p, m) => `Vous êtes en position ${p} dans la file d'attente. Le temps d'attente estimé est de ${m} minute${m === 1 ? '' : 's'}.`,
  noAgents: "Aucun agent n'est disponible pour le moment. Veuillez réessayer plus tard.",
  botEnded: 'La conversation est terminée. Vous pouvez télécharger la transcription depuis le menu.',
  userEnded: 'Vous avez mis fin à la conversation. Vous pouvez télécharger la transcription depuis le menu.',
  waitForAgent: "Veuillez patienter jusqu'à ce qu'un agent rejoigne la conversation.",
  tooLong: 'Le message est trop long (max. 2000 caractères).',
  system: {
    routing_notice: () => fr.routingNotice,
    connected: ({ agentName }) => `Vous êtes en relation avec ${agentName}. Merci de votre patience.`,
    transferring: () => 'Cette conversation est en cours de transfert vers un autre agent.',
    agent_disconnected: () => "L'agent s'est déconnecté, cette conversation est remise en file d'attente en priorité.",
    ended_by_agent: ({ agentName }) => `${agentName} a mis fin à la conversation. Merci d'avoir contacté Swift Payments.`,
    ended_by_user: () => "Vous avez mis fin à la conversation. Merci d'avoir contacté Swift Payments.",
    left_queue: () => "Vous avez quitté la file d'attente. La conversation est terminée.",
    transfer_failed: ({ agentName }) => `Le transfert n'a pas pu être effectué. Vous êtes toujours en relation avec ${agentName}.`,
  },
  intents: {
    agent: /\b(agent|humain|conseiller|personne|quelqu'un)\b/,
    payments: /\b(paiement|paiements|payer|virement)\b/,
    reports: /\b(rapport|rapports|relevé|relevés|releve)\b/,
    entitlements: /\b(droit|droits|accès|acces|mot de passe|déverrouiller|verrouillé|jeton|identifiant)\b/,
    claims: /\b(réclamation|reclamation|réclamations|litige)\b/,
    somethingElse: /\b(aide|autre|chose)\b/,
  },
  ui: {
    title: 'Discutez avec Nous',
    chatMenu: 'Menu du chat',
    endConversation: 'Terminer la conversation',
    downloadTranscript: 'Télécharger la transcription',
    minimize: 'Réduire',
    availableAfterEnd: 'Disponible une fois la conversation terminée',
    startNewChat: 'Démarrer une nouvelle discussion',
    typeMessage: 'Saisissez un message',
    waitingForAgent: "En attente d'un agent...",
    conversationEnded: 'Cette conversation est terminée',
    delivered: 'Distribué',
    connectionLost: 'Connexion perdue. Reconnexion...',
    isTyping: 'est en train d’écrire',
    transcriptTitle: 'Swift Payments - Transcription du Chat',
    privacy: 'Confidentialité',
    terms: 'Conditions Générales',
  },
}

const zh: Strings = {
  botName: 'Swift 助手',
  greeting: (n) => `${n}，您好。我是 Swift Payments 助手！`,
  mainMenuPrompt: '请选择下方的选项，或用几句话告诉我您需要什么帮助。',
  subMenuPrompt: '请从以下选项中选择：',
  postPrompt: '还有什么可以帮您的吗？',
  options: {
    payments: '付款',
    reports: '报表或对账单',
    entitlements: '用户权限或访问',
    claims: '理赔申诉',
    something_else: '其他帮助',
    existing_payment: '现有付款',
    new_payment: '新付款',
    yes: '是',
    no: '否',
    chat_with_agent: '与客服人员聊天',
    download_report: '下载报表',
    verify_report: '验证报表',
    create_template: '创建报表模板',
    schedule_report: '定时报表',
    unlock_user: '解锁用户',
    forgot_password: '忘记密码',
    mobile_token: '手机令牌',
    view_claims: '查看以往申诉',
    new_claim: '发起新申诉',
    update_claim: '更新申诉',
  },
  ratings: ['1 - 差', '2 - 一般', '3 - 好', '4 - 很好', '5 - 非常好'],
  responses: {
    new_payment: { text: '请通过我们的“如何付款”指南了解如何进行付款。', linkLabel: '如何付款' },
    download_report: {
      text: '您可以在 报表 > 报表中心 下载账户对账单和报表。选择账户、日期范围和格式（PDF、CSV 或 XLSX），然后点击下载。最近 24 个月的报表可即时获取。',
    },
    verify_report: {
      text: '要验证报表，请打开 报表 > 报表中心，找到该报表并点击“验证”。Swift Payments 会检查数字签名，并确认报表自生成以来未被更改。',
    },
    create_template: {
      text: '报表模板可保存您常用的筛选条件。前往 报表 > 模板 > 创建模板，选择账户、列和计划，然后保存。模板可与您组织内的其他用户共享。',
    },
    schedule_report: {
      text: '定时报表会自动发送到您的邮箱。前往 报表 > 计划 > 新建计划，选择模板、频率（每日、每周或每月）和发送渠道。',
    },
    unlock_user: {
      text: '安全管理员可在 管理 > 用户 > 选择用户 > 解锁 中解锁用户。如果您是唯一的安全管理员，请使用“与客服人员聊天”选项，我们将核实您的身份并解锁您的访问权限。',
    },
    forgot_password: {
      text: '在登录页面点击“忘记密码”，输入您的用户 ID，并按照发送到您注册邮箱或手机的一次性验证码操作。新密码须至少 12 个字符，并包含字母、数字和符号。',
    },
    mobile_token: {
      text: '要激活 Swift Payments 手机令牌，请安装 Swift Authenticator 应用，选择“激活令牌”，然后扫描 个人资料 > 安全 > 手机令牌 中显示的二维码。令牌在 90 天未使用后会过期。',
    },
    view_claims: {
      text: '您以往的申诉列于 服务 > 申诉 > 申诉历史。您可以按状态（进行中、审核中、已解决、已拒绝）筛选，并下载每项申诉的结果通知书。',
    },
    new_claim: {
      text: '要发起新申诉，请前往 服务 > 申诉 > 新申诉，选择有争议的交易，选择原因并附上证明文件。您将在几分钟内收到申诉编号。',
    },
    update_claim: {
      text: '打开 服务 > 申诉 > 申诉历史，选择该申诉并点击“更新”以添加文件或备注。申诉在“进行中”或“审核中”状态下均可更新。',
    },
  },
  existingPaymentPrompt: '请输入参考编号',
  existingPaymentResponse: (ref, date) =>
    `付款 ${ref} 已于 ${date} 处理，当前状态为“已完成”。资金通常会在 1-2 个工作日内到达收款人账户。您可在 付款 > 付款历史 中查看付款凭证。`,
  invalidReference: '这看起来不是有效的参考编号。请输入 6 至 20 位字母数字参考编号（例如 SP2026091401）。',
  referenceGiveUp: '我无法找到该笔付款。我们的客服人员可以为您查询。',
  fallback: '抱歉，我没有理解您的意思。请选择以下选项之一。',
  pickRating: '请选择以下评分之一。',
  surveyRating: '在您离开之前，您如何评价今天的体验？',
  surveyFeedback: '谢谢！我们还有哪些可以改进的地方？请在下方输入您的反馈（或输入“跳过”）。',
  surveyThanks: '感谢您的反馈。祝您愉快！',
  routingNotice: '我将为您转接一位能够提供帮助的客服人员。请注意，在某些国家/地区，客服支持可能仅提供英语服务。如需您所在地区语言的支持，请告知客服人员，他们会指导您后续步骤。',
  queuePosition: (p, m) => `您目前排在第 ${p} 位。预计等待时间为 ${m} 分钟。`,
  noAgents: '目前没有可用的客服人员。请稍后再试。',
  botEnded: '对话已结束。您可以从菜单下载聊天记录。',
  userEnded: '您已结束对话。您可以从菜单下载聊天记录。',
  waitForAgent: '请等待客服人员加入对话。',
  tooLong: '消息过长（最多 2000 个字符）。',
  system: {
    routing_notice: () => zh.routingNotice,
    connected: ({ agentName }) => `您已与 ${agentName} 建立连接。感谢您的耐心等待。`,
    transferring: () => '此对话正在转接给另一位客服人员。',
    agent_disconnected: () => '客服人员已断开连接，此对话正在优先重新排队。',
    ended_by_agent: ({ agentName }) => `${agentName} 已结束对话。感谢您联系 Swift Payments。`,
    ended_by_user: () => '您已结束对话。感谢您联系 Swift Payments。',
    left_queue: () => '您已离开队列。对话已结束。',
    transfer_failed: ({ agentName }) => `转接未能完成。您仍与 ${agentName} 保持连接。`,
  },
  intents: {
    agent: /(客服|人工|真人|专员|有人)/,
    payments: /(付款|支付|转账|汇款)/,
    reports: /(报表|对账单|报告|流水)/,
    entitlements: /(权限|访问|密码|解锁|锁定|令牌|登录)/,
    claims: /(申诉|理赔|争议|索赔)/,
    somethingElse: /(帮助|其他|别的)/,
  },
  ui: {
    title: '在线客服',
    chatMenu: '聊天菜单',
    endConversation: '结束对话',
    downloadTranscript: '下载聊天记录',
    minimize: '最小化',
    availableAfterEnd: '对话结束后可用',
    startNewChat: '开始新对话',
    typeMessage: '输入消息',
    waitingForAgent: '正在等待客服人员加入...',
    conversationEnded: '此对话已结束',
    delivered: '已送达',
    connectionLost: '连接已断开。正在重新连接...',
    isTyping: '正在输入',
    transcriptTitle: 'Swift Payments - 聊天记录',
    privacy: '隐私',
    terms: '条款与条件',
  },
}

const de: Strings = {
  botName: 'Swift-Assistent',
  greeting: (n) => `Hallo ${n}, ich bin der Swift Payments Assistent!`,
  mainMenuPrompt: 'Bitte wählen Sie unten eine Option oder sagen Sie mir in wenigen Worten, wobei Sie Hilfe benötigen.',
  subMenuPrompt: 'Wählen Sie eine der folgenden Optionen:',
  postPrompt: 'Kann ich Ihnen noch bei etwas anderem helfen?',
  options: {
    payments: 'Zahlungen',
    reports: 'Berichte oder Kontoauszüge',
    entitlements: 'Benutzerberechtigungen oder Zugriff',
    claims: 'Reklamationen',
    something_else: 'Hilfe zu etwas anderem',
    existing_payment: 'Bestehende Zahlungen',
    new_payment: 'Neue Zahlungen',
    yes: 'Ja',
    no: 'Nein',
    chat_with_agent: 'Mit einem Mitarbeiter chatten',
    download_report: 'Bericht herunterladen',
    verify_report: 'Bericht prüfen',
    create_template: 'Berichtsvorlage erstellen',
    schedule_report: 'Bericht planen',
    unlock_user: 'Benutzer entsperren',
    forgot_password: 'Passwort vergessen',
    mobile_token: 'Mobiles Token',
    view_claims: 'Frühere Reklamationen anzeigen',
    new_claim: 'Neue Reklamation starten',
    update_claim: 'Reklamation aktualisieren',
  },
  ratings: ['1 - Schlecht', '2 - Ausreichend', '3 - Gut', '4 - Sehr gut', '5 - Ausgezeichnet'],
  responses: {
    new_payment: { text: 'Erfahren Sie in unserem Leitfaden Zahlung ausführen, wie Sie eine Zahlung vornehmen.', linkLabel: 'Zahlung ausführen' },
    download_report: {
      text: 'Kontoauszüge und Berichte können Sie unter Berichte > Berichtszentrum herunterladen. Wählen Sie Konto, Zeitraum und Format (PDF, CSV oder XLSX) und klicken Sie auf Herunterladen. Berichte der letzten 24 Monate sind sofort verfügbar.',
    },
    verify_report: {
      text: 'Um einen Bericht zu prüfen, öffnen Sie Berichte > Berichtszentrum, suchen Sie den Bericht und klicken Sie auf Prüfen. Swift Payments überprüft die digitale Signatur und bestätigt, dass der Bericht seit seiner Erstellung nicht verändert wurde.',
    },
    create_template: {
      text: 'Mit Berichtsvorlagen speichern Sie Ihre bevorzugten Filter. Gehen Sie zu Berichte > Vorlagen > Vorlage erstellen, wählen Sie Konten, Spalten und Zeitplan und speichern Sie. Vorlagen können mit anderen Benutzern Ihrer Organisation geteilt werden.',
    },
    schedule_report: {
      text: 'Geplante Berichte werden automatisch an Ihr Postfach gesendet. Gehen Sie zu Berichte > Zeitpläne > Neuer Zeitplan, wählen Sie eine Vorlage, die Häufigkeit (täglich, wöchentlich oder monatlich) und den Zustellkanal.',
    },
    unlock_user: {
      text: 'Ein Sicherheitsmanager kann einen Benutzer unter Administration > Benutzer > Benutzer auswählen > Entsperren entsperren. Wenn Sie der einzige Sicherheitsmanager sind, nutzen Sie bitte die Option Mit einem Mitarbeiter chatten; wir verifizieren Ihre Identität und stellen Ihren Zugriff wieder her.',
    },
    forgot_password: {
      text: 'Klicken Sie auf der Anmeldeseite auf Passwort vergessen, geben Sie Ihre Benutzer-ID ein und folgen Sie dem Einmalcode, der an Ihre registrierte E-Mail-Adresse oder Mobilnummer gesendet wird. Neue Passwörter müssen mindestens 12 Zeichen mit Buchstaben, Zahlen und Symbolen enthalten.',
    },
    mobile_token: {
      text: 'Um das mobile Token von Swift Payments zu aktivieren, installieren Sie die App Swift Authenticator, wählen Sie Token aktivieren und scannen Sie den QR-Code unter Profil > Sicherheit > Mobiles Token. Tokens verfallen nach 90 Tagen Inaktivität.',
    },
    view_claims: {
      text: 'Ihre früheren Reklamationen finden Sie unter Services > Reklamationen > Verlauf. Sie können nach Status filtern (Offen, In Prüfung, Erledigt, Abgelehnt) und das Ergebnisschreiben jeder Reklamation herunterladen.',
    },
    new_claim: {
      text: 'Um eine neue Reklamation zu starten, gehen Sie zu Services > Reklamationen > Neue Reklamation, wählen Sie die strittige Transaktion, geben Sie einen Grund an und fügen Sie Belege bei. Sie erhalten innerhalb weniger Minuten eine Reklamationsnummer.',
    },
    update_claim: {
      text: 'Öffnen Sie Services > Reklamationen > Verlauf, wählen Sie die Reklamation und klicken Sie auf Aktualisieren, um Dokumente oder Kommentare hinzuzufügen. Reklamationen können aktualisiert werden, solange sie Offen oder In Prüfung sind.',
    },
  },
  existingPaymentPrompt: 'Bitte geben Sie die Referenznummer ein',
  existingPaymentResponse: (ref, date) =>
    `Die Zahlung ${ref} wurde am ${date} verarbeitet und hat derzeit den Status Abgeschlossen. Der Betrag wird in der Regel innerhalb von 1-2 Werktagen auf dem Empfängerkonto gutgeschrieben. Den Zahlungsbeleg finden Sie unter Zahlungen > Zahlungsverlauf.`,
  invalidReference: 'Das sieht nicht wie eine gültige Referenznummer aus. Bitte geben Sie eine alphanumerische Referenz mit 6-20 Zeichen ein (z. B. SP2026091401).',
  referenceGiveUp: 'Ich kann diese Zahlung nicht finden. Unsere Mitarbeiter können sie für Sie nachsehen.',
  fallback: 'Das habe ich leider nicht verstanden. Bitte wählen Sie eine der folgenden Optionen.',
  pickRating: 'Bitte wählen Sie eine der folgenden Bewertungen.',
  surveyRating: 'Bevor Sie gehen: Wie bewerten Sie Ihre heutige Erfahrung?',
  surveyFeedback: 'Vielen Dank! Gibt es etwas, das wir besser machen könnten? Geben Sie Ihr Feedback unten ein (oder tippen Sie „überspringen“).',
  surveyThanks: 'Vielen Dank für Ihr Feedback. Einen schönen Tag noch!',
  routingNotice:
    'Ich leite Sie an einen Mitarbeiter weiter, der Ihnen helfen kann. Bitte beachten Sie, dass der Mitarbeiter-Support in einigen Ländern nur auf Englisch verfügbar ist. Für Unterstützung in Ihrer Sprache informieren Sie bitte den Mitarbeiter, der Sie zu den nächsten Schritten anleitet.',
  queuePosition: (p, m) => `Sie sind Nummer ${p} in der Warteschlange. Die voraussichtliche Wartezeit beträgt ${m} Minute${m === 1 ? '' : 'n'}.`,
  noAgents: 'Derzeit sind keine Mitarbeiter verfügbar. Bitte versuchen Sie es später erneut.',
  botEnded: 'Die Unterhaltung wurde beendet. Sie können das Protokoll über das Menü herunterladen.',
  userEnded: 'Sie haben die Unterhaltung beendet. Sie können das Protokoll über das Menü herunterladen.',
  waitForAgent: 'Bitte warten Sie, bis ein Mitarbeiter der Unterhaltung beitritt.',
  tooLong: 'Die Nachricht ist zu lang (max. 2000 Zeichen).',
  system: {
    routing_notice: () => de.routingNotice,
    connected: ({ agentName }) => `Sie sind mit ${agentName} verbunden. Vielen Dank für Ihre Geduld.`,
    transferring: () => 'Diese Unterhaltung wird an einen anderen Mitarbeiter übergeben.',
    agent_disconnected: () => 'Der Mitarbeiter wurde getrennt; diese Unterhaltung wird mit Priorität neu eingereiht.',
    ended_by_agent: ({ agentName }) => `${agentName} hat die Unterhaltung beendet. Vielen Dank, dass Sie Swift Payments kontaktiert haben.`,
    ended_by_user: () => 'Sie haben die Unterhaltung beendet. Vielen Dank, dass Sie Swift Payments kontaktiert haben.',
    left_queue: () => 'Sie haben die Warteschlange verlassen. Die Unterhaltung wurde beendet.',
    transfer_failed: ({ agentName }) => `Die Übergabe konnte nicht abgeschlossen werden. Sie sind weiterhin mit ${agentName} verbunden.`,
  },
  intents: {
    agent: /\b(mitarbeiter|mensch|berater|person|jemand)\b/,
    payments: /\b(zahlung|zahlungen|zahlen|überweisung|ueberweisung)\b/,
    reports: /\b(bericht|berichte|kontoauszug|kontoauszüge|auszug)\b/,
    entitlements: /\b(berechtigung|berechtigungen|zugriff|passwort|entsperren|gesperrt|token|anmeldung|login)\b/,
    claims: /\b(reklamation|reklamationen|beschwerde|streitfall)\b/,
    somethingElse: /\b(hilfe|anderes|sonstiges|etwas)\b/,
  },
  ui: {
    title: 'Chatten Sie mit uns',
    chatMenu: 'Chat-Menü',
    endConversation: 'Unterhaltung beenden',
    downloadTranscript: 'Protokoll herunterladen',
    minimize: 'Minimieren',
    availableAfterEnd: 'Verfügbar, sobald die Unterhaltung beendet ist',
    startNewChat: 'Neuen Chat starten',
    typeMessage: 'Nachricht eingeben',
    waitingForAgent: 'Warten auf einen Mitarbeiter...',
    conversationEnded: 'Diese Unterhaltung wurde beendet',
    delivered: 'Zugestellt',
    connectionLost: 'Verbindung unterbrochen. Verbindung wird wiederhergestellt...',
    isTyping: 'schreibt',
    transcriptTitle: 'Swift Payments - Chat-Protokoll',
    privacy: 'Datenschutz',
    terms: 'Allgemeine Geschäftsbedingungen',
  },
}

export const STRINGS: Record<Lang, Strings> = { en, es, fr, zh, de }

/** English labels are sent to the agent desktop as the contact reason regardless of the customer's language. */
export const englishLabel = (id: OptionId) => en.options[id]

/** Map free text in the given language to a menu option id; null when nothing matched. */
export function detectIntent(text: string, lang: Lang): OptionId | null {
  const t = text.toLowerCase()
  const i = STRINGS[lang].intents
  if (i.agent.test(t)) return 'chat_with_agent'
  if (i.payments.test(t)) return 'payments'
  if (i.reports.test(t)) return 'reports'
  if (i.entitlements.test(t)) return 'entitlements'
  if (i.claims.test(t)) return 'claims'
  if (i.somethingElse.test(t)) return 'something_else'
  return null
}

/** Localise a server system message when it carries a known key; fall back to the server's English text. */
export function localiseSystem(text: string, key: string | undefined, params: Record<string, string> | undefined, lang: Lang): string {
  if (!key) return text
  const fn = STRINGS[lang].system[key as SystemKey]
  return fn ? fn(params ?? {}) : text
}
