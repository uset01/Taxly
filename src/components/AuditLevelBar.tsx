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
      className={`rounded-[16px] bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2A2A2A] p-4 text-left ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[13px] font-bold text-[#111111] dark:text-[#F3F4F6] uppercase tracking-[0.04em]">
          Nível {safeLevel} de 3 de auditoria
        </span>
        <span className="text-[12px] font-semibold text-[#00A844] dark:text-[#22C55E] bg-[#00C853]/10 px-2 py-0.5 rounded-full">
          {progressPercent}% concluído
        </span>
      </div>

      {/* Barra segmentada de progresso */}
      <div className="grid grid-cols-3 gap-1.5 h-2 w-full my-2.5">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              step <= safeLevel
                ? "bg-[#00C853]"
                : "bg-[#E5E5E5] dark:bg-[#2F2F2F]"
            }`}
          />
        ))}
      </div>

      {/* Texto de orientação por nível */}
      {safeLevel < 3 ? (
        <div className="flex items-start justify-between gap-3 mt-2">
          <p className="text-[12.5px] leading-snug text-[#4B5563] dark:text-[#A1A1AA]">
            Envie mais {3 - safeLevel === 1 ? "1 extrato" : `${3 - safeLevel} extratos`} e libere o diagnóstico completo do mês.
          </p>
          {onSendAnother && (
            <button
              type="button"
              onClick={onSendAnother}
              className="text-[12.5px] font-bold text-[#00A844] hover:text-[#008A39] underline underline-offset-2 shrink-0 cursor-pointer"
            >
              + Enviar outro
            </button>
          )}
        </div>
      ) : isSubscribed ? (
        <p className="text-[12.5px] leading-snug text-[#008A39] dark:text-[#22C55E] font-medium mt-1">
          ✓ Auditoria mensal completa desbloqueada com plano ativo.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-2 mt-2">
          <p className="text-[12.5px] leading-snug text-[#4B5563] dark:text-[#A1A1AA]">
            Nível 3 atingido! Ative sua assinatura para ver o raio-x total.
          </p>
          {onUnlockFull && (
            <button
              type="button"
              onClick={onUnlockFull}
              className="text-[12px] font-bold px-2.5 py-1 rounded-[8px] bg-[#00C853] text-black hover:bg-[#00B54B] shrink-0 cursor-pointer"
            >
              Liberar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
