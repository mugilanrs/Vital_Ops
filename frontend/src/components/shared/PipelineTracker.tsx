import { Target, Brain, Lightbulb, UserCheck, ShieldCheck, CheckCircle, Loader } from 'lucide-react';

const STAGES = [
  { key: 'triage',       label: 'Auto-Triage',  icon: Target,      color: '#F41C5E', bg: '#FFF0F4', border: '#FDD7E2' },
  { key: 'intelligence', label: 'Intelligence',  icon: Brain,       color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
  { key: 'irr',          label: 'IRR Agent',     icon: Lightbulb,   color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  { key: 'human_review', label: 'Human Review',  icon: UserCheck,   color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { key: 'dq',           label: 'DQ Validation', icon: ShieldCheck, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
];

const STAGE_ORDER = ['triage', 'intelligence', 'irr', 'human_review', 'dq'];

type StageStatus = 'pending' | 'running' | 'done';

function getStageStatus(key: string, activeStage: string): StageStatus {
  const activeIdx = STAGE_ORDER.indexOf(activeStage);
  const keyIdx = STAGE_ORDER.indexOf(key);
  if (activeIdx < 0) return 'pending';
  if (keyIdx < activeIdx) return 'done';
  if (keyIdx === activeIdx) return 'running';
  return 'pending';
}

interface Props {
  activeStage: string;
  completedStages?: string[];
}

export function PipelineTracker({ activeStage, completedStages }: Props) {
  const activeIdx = STAGE_ORDER.indexOf(activeStage);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0, width: '100%' }}>
      {STAGES.map((stage, i) => {
        const Icon = stage.icon;
        const status = completedStages?.includes(stage.key)
          ? 'done'
          : getStageStatus(stage.key, activeStage);
        const isRunning = status === 'running';
        const isDone = status === 'done';
        const isPending = status === 'pending';

        return (
          <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {/* Stage node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 'none' }}>
              {/* Circle */}
              <div style={{ position: 'relative' }}>
                {/* Pulsing ring for running */}
                {isRunning && (
                  <div
                    className="animate-glow"
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '50%',
                      border: `2px solid ${stage.color}`,
                      opacity: 0.4,
                    }}
                  />
                )}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDone
                    ? '#ECFDF5'
                    : isRunning
                    ? stage.bg
                    : '#F9FAFB',
                  border: `2px solid ${
                    isDone ? '#10B981' : isRunning ? stage.color : '#E5E7EB'
                  }`,
                  color: isDone ? '#10B981' : isRunning ? stage.color : '#9CA3AF',
                  transition: 'all 0.3s ease',
                  boxShadow: isRunning ? `0 0 0 4px ${stage.bg}` : isDone ? '0 0 0 4px #ECFDF520' : 'none',
                }}>
                  {isDone ? (
                    <CheckCircle size={19} />
                  ) : isRunning ? (
                    <div className="animate-spin-slow" style={{ display: 'flex' }}>
                      <Loader size={19} />
                    </div>
                  ) : (
                    <Icon size={17} />
                  )}
                </div>
              </div>

              {/* Label */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: isDone || isRunning ? 700 : 500,
                  color: isDone ? '#10B981' : isRunning ? stage.color : '#9CA3AF',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.3s',
                }}>
                  {stage.label}
                </div>
                <div style={{
                  fontSize: 10,
                  color: isDone ? '#10B981' : isRunning ? stage.color : '#CBD5E1',
                  fontWeight: 600,
                  marginTop: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {isDone ? 'Done' : isRunning ? 'Running' : 'Pending'}
                </div>
              </div>
            </div>

            {/* Connector line */}
            {i < STAGES.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                margin: '0 4px',
                marginBottom: 28,
                background: '#F0F0F0',
                borderRadius: 99,
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  borderRadius: 99,
                  background: 'linear-gradient(90deg, #10B981, #34D399)',
                  width: STAGE_ORDER.indexOf(STAGES[i + 1].key) <= activeIdx ? '100%' : '0%',
                  transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
