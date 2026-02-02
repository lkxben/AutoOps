import { BaseEdge, EdgeProps, getBezierPath } from "reactflow"

export default function ConditionalEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, label } = props
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY })
  return (
    <>
      <BaseEdge id={id} path={path} style={{ strokeDasharray: "6 4", stroke: "#f59e0b" }} />
      {label && <text><textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{label}</textPath></text>}
    </>
  )
}