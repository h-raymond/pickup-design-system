// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=66-400
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/SummaryCard/SummaryCard.tsx
// component=SummaryCard
import figma from 'figma'
const instance = figma.selectedInstance

const titleLayer = instance.findText('Mustard lounge chair')
const title = titleLayer && titleLayer.type === 'TEXT' ? titleLayer.textContent : 'Item title'
const metaLayer = instance.findText('$420 · Excellent')
const meta = metaLayer && metaLayer.type === 'TEXT' ? metaLayer.textContent : ''

export default {
  example: figma.code`<SummaryCard title={${JSON.stringify(title)}} meta={${JSON.stringify(meta)}} />`,
  imports: ['import { SummaryCard } from "@figma/pickup-design-system"'],
  id: 'summary-card',
  metadata: { nestable: false },
}
