export interface CancelGuideMetadata {
  steps: string[];
  script: string;
  lastVerifiedAt: string;
  needsManualVerification: boolean;
}

/**
 * Guias de cancelamento por serviço com data da última verificação.
 * ATENÇÃO: Os serviços marcados com `needsManualVerification: true` (TODO)
 * tiveram mudanças recentes de menu e precisam de conferência manual.
 */
export const CANCEL_GUIDES: Record<string, CancelGuideMetadata> = {
  netflix: {
    lastVerifiedAt: "2026-10-20",
    needsManualVerification: false,
    steps: [
      "Acesse netflix.com/youraccount pelo navegador ou abra o app e toque no ícone do perfil.",
      "Toque em 'Conta' e localize a seção 'Assinatura'.",
      "Selecione 'Cancelar assinatura' e confirme em 'Concluir cancelamento'.",
    ],
    script:
      "Olá! Solicito o cancelamento imediato da minha assinatura Netflix vinculada ao meu CPF/e-mail e a confirmação de que não haverá novas cobranças na próxima fatura.",
  },
  spotify: {
    lastVerifiedAt: "2026-10-18",
    needsManualVerification: false,
    steps: [
      "Acesse spotify.com/account pelo navegador (o app não exibe o botão de cancelamento direto).",
      "Em 'Seu plano', clique em 'Alterar plano'.",
      "Role até 'Spotify Free' e toque em 'Cancelar o Premium'.",
    ],
    script:
      "Olá! Identifiquei um reajuste na cobrança do Spotify na minha fatura e desejo cancelar a renovação automática do plano Premium imediatamente.",
  },
  "amazon-prime": {
    lastVerifiedAt: "2026-10-12",
    needsManualVerification: false,
    steps: [
      "No app ou site da Amazon, acesse 'Sua Conta' > 'Sua assinatura Prime'.",
      "Toque em 'Gerenciar assinatura' > 'Atualizar, cancelar e mais'.",
      "Selecione 'Encerrar a assinatura' e confirme na tela seguinte.",
    ],
    script:
      "Olá! Consta uma cobrança duplicada do Amazon Prime na minha fatura deste mês. Solicito o estorno da cobrança duplicada e o cancelamento da renovação automática.",
  },
  // TODO [Conferência Manual]: A Adobe alterou o fluxo de retenção/multa rescisória no painel Admin/Account em 2026. Conferir passos exatos no menu web.
  "adobe-cc": {
    lastVerifiedAt: "2026-07-05",
    needsManualVerification: true,
    steps: [
      "Acesse account.adobe.com/plans e faça login na sua conta.",
      "Clique em 'Gerenciar plano' ao lado do Adobe Creative Cloud.",
      "Selecione 'Cancelar seu plano', informe o motivo e avance até a tela final de confirmação.",
    ],
    script:
      "Olá! O período de teste gratuito da Adobe Creative Cloud foi convertido em cobrança na minha fatura sem meu uso ativo. Solicito o cancelamento imediato do plano e o estorno integral do valor cobrado.",
  },
  // TODO [Conferência Manual]: O Gympass mudou de marca para Wellhub e reestruturou o menu de pausa/cancelamento no app mobile. Conferir rótulos atuais.
  wellhub: {
    lastVerifiedAt: "2026-06-19",
    needsManualVerification: true,
    steps: [
      "Abra o app Wellhub (antigo Gympass) e toque em 'Perfil' no canto superior.",
      "Acesse 'Configurações da conta' > 'Gerenciar assinatura'.",
      "Toque em 'Cancelar plano' antes da data de renovação do ciclo mensal.",
    ],
    script:
      "Olá! Solicito o cancelamento imediato do meu plano mensal no Wellhub (Gympass) para interromper as próximas cobranças recorrentes no meu cartão.",
  },
  // TODO [Conferência Manual]: Conferir caminho atualizado no iOS 19 / Ajustes da Conta Apple para downgrade do iCloud+.
  "icloud-plus": {
    lastVerifiedAt: "2026-08-02",
    needsManualVerification: true,
    steps: [
      "No iPhone ou iPad, abra 'Ajustes' e toque no seu nome no topo da tela.",
      "Toque em 'iCloud' > 'Gerenciar Armazenamento da Conta' > 'Mudar Plano'.",
      "Selecione 'Opções de Downgrade' e escolha o plano gratuito de 5 GB.",
    ],
    script:
      "Olá! Desejo realizar o downgrade imediato da minha assinatura iCloud+ 200GB para o plano gratuito e encerrar a cobrança mensal no cartão.",
  },
};
