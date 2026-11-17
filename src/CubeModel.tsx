type CubeModelProps = {
  expression: string
}

const makeCubes = (count: number, removed = 0) => Array.from({ length: count }, (_, index) => (
  <span className={`math-cube ${index >= count - removed ? 'is-removed' : ''}`} key={index} />
))

export function CubeModel({ expression }: CubeModelProps) {
  const match = expression.match(/^\s*(\d+)\s*([+\-×÷])\s*(\d+)\s*$/)
  if (!match) return null

  const first = Number(match[1])
  const operation = match[2]
  const second = Number(match[3])
  if (first < 1 || second < 1 || first > 20 || second > 20) return null

  const description = operation === '+'
    ? `${first} cubes plus ${second} cubes. Count all the cubes to solve ${expression}.`
    : operation === '-'
      ? `${first} cubes with ${second} taken away. Count the cubes left to solve ${expression}.`
      : operation === '×'
        ? `${first} equal groups with ${second} cubes in each group. Count the cubes to solve ${expression}.`
        : `Share ${first} cubes equally into ${second} groups to solve ${expression}.`

  return (
    <section className="cube-model" role="img" aria-label={description}>
      <span className="cube-model-title" aria-hidden="true">Use the cubes to solve</span>
      <div className="cube-model-workspace" aria-hidden="true">
        {operation === '+' && <>
          <div className="cube-group"><span>First group</span><div className="cube-row cube-row-first">{makeCubes(first)}</div></div>
          <span className="cube-operation">+</span>
          <div className="cube-group"><span>More cubes</span><div className="cube-row cube-row-second">{makeCubes(second)}</div></div>
        </>}
        {operation === '-' && <div className="cube-group"><span>Cross out {second} cubes</span><div className="cube-row cube-row-first">{makeCubes(first, Math.min(first, second))}</div></div>}
        {operation === '×' && <div className="cube-multiplication">
          {Array.from({ length: first }, (_, index) => <div className="cube-group" key={index}><span>Group {index + 1}</span><div className="cube-row cube-row-first">{makeCubes(second)}</div></div>)}
        </div>}
        {operation === '÷' && <div className="cube-division">
          <div className="cube-group"><span>Share these cubes</span><div className="cube-row cube-row-first">{makeCubes(first)}</div></div>
          <span className="cube-operation">into</span>
          <div className="cube-share-targets">{Array.from({ length: second }, (_, index) => <span className="cube-share-target" key={index}>Group {index + 1}</span>)}</div>
        </div>}
      </div>
    </section>
  )
}
