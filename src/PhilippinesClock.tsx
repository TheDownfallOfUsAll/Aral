import './PhilippinesClock.css'

type PhilippinesClockProps = {
  now: Date
  compact?: boolean
  className?: string
}

function getPhilippinesTime(date: Date) {
  const parts = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)
  const hour = getPart('hour')
  const minute = getPart('minute')
  const second = getPart('second')

  return {
    hourDegrees: (hour % 12) * 30 + minute * 0.5,
    minuteDegrees: minute * 6 + second * 0.1,
    secondDegrees: second * 6,
  }
}

export function PhilippinesClock({ now, compact = false, className = '' }: PhilippinesClockProps) {
  const dateText = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'full',
  }).format(now)
  const timeText = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(now)
  const hands = getPhilippinesTime(now)

  return (
    <div
      className={`philippines-clock ${compact ? 'compact' : ''} ${className}`.trim()}
      aria-label={`Philippines local time: ${dateText}, ${timeText} PHT`}
    >
      <span className="philippines-clock-face" aria-hidden="true">
        <i className="clock-hand hour-hand" style={{ transform: `translateX(-50%) rotate(${hands.hourDegrees}deg)` }} />
        <i className="clock-hand minute-hand" style={{ transform: `translateX(-50%) rotate(${hands.minuteDegrees}deg)` }} />
        <i className="clock-hand second-hand" style={{ transform: `translateX(-50%) rotate(${hands.secondDegrees}deg)` }} />
        <i className="clock-center" />
      </span>
      <span className="philippines-clock-copy">
        <span className="philippines-clock-label">{compact ? 'PHILIPPINES · PHT' : 'PHILIPPINES LOCAL TIME'}</span>
        <strong className="philippines-clock-time">{timeText}</strong>
        {!compact && <span className="philippines-clock-date">{dateText}</span>}
      </span>
    </div>
  )
}
