"use client";

interface AuditLevelBarProps {
  currentLevel?: number; // 1, 2 ou 3
  isSubscribed?: boolean;
  onSendAnother?: () => void;
  onUnlockFull?: () => void;
  className?: string;
}

/**
 * Barra de progressão em níveis de auditoria (Nível 1 a 3).
 * Instiga o envio do próximo extrato para liberar diagnóstico completo.
 */
export function AuditLevelBar({
  currentLevel = 1,
  isSubscribed = false,
  onSendAnother,
  onUnlockFull,
  className = "",
}: AuditLevelBarProps) {
  const safeLevel = Math.min(3, Math.max(1, currentLevel));
  const progressPercent = safeLevel === 1 ? 33 : safeLevel === 2 ? 66 : 100;

  return (
    <div
      aria-label={`Progresso de auditoria: Nível ${safeLevel} de 3`}
      className={`rounded-[14px] bg-white border border-[#EAEAE7] p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}
    >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[12px] font-semibold text-[#171717] uppercase tracking-[0.04em]">
              Nível {safeLevel} de 3 de auditoria
            </span>
              <span className="text-[11.5px] font-medium text-[#087D4A] dark:text-[#08B968] bg-[#08B968]/10 px-2.5 py-0.5 rounded-full tabular-nums">
                {progressPercent}% concluído
              </span>
          </div>

          {/* Barra segmentada de progresso */}
            <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full my-2.5">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-full rounded-full transition-all duration-300 ${step <= safeLevel
                        ? "bg-[#08B968]"
                        : "bg-[#F5F5F2]"
                    }`}
                />
              ))}
            </div>

            {/* Texto de orientação por nível */}
            {safeLevel < 3 ? (
              <div className="flex items-start justify-between gap-3 mt-2">
                  <p className="text-[12.5px] leading-snug text-[#858585] font-normal">
                    Envie mais {3 - safeLevel === 1 ? "1 fatura ou extrato" : `${3 - safeLevel} faturas ou extratos`} para encontrar até 3x mais valores ocultos.
                  </p>
                  {onSendAnother && (
                    <button
                      type="button"
                      onClick={onSendAnother}
                      className="text-[12.5px] font-semibold text-[#087D4A] hover:text-[#08B968] underline underline-offset-2 shrink-0 cursor-pointer transition-colors"
                    >
                      + Enviar outro
                    </button>
                  )}
              </div>
            ) : isSubscribed ? (
                <p className="text-[12.5px] leading-snug text-[#087D4A] dark:text-[#08B968] font-medium mt-1">
                  Auditoria mensal completa desbloqueada com plano ativo.
                </p>
                ) : (
                <div className="flex items-center justify-between gap-2 mt-2">
                    <p className="text-[12.5px] leading-snug text-[#858585] font-normal">
                      Nível 3 atingido! Ative sua assinatura para ver o raio-x total.
                    </p>
                    {onUnlockFull && (
                      <button
                        type="button"
                        onClick={onUnlockFull}
                        className="text-[12px] font-semibold px-3 py-1 rounded-[8px] bg-[#08B968] text-white hover:bg-[#087D4A] shrink-0 cursor-pointer transition-colors"
                      >
                        Liberar
                      </button>
                    )}
                </div>
      )}
              </div>
            );
}

