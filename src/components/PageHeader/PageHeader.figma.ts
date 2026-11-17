// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=66-410
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/PageHeader/PageHeader.tsx
// component=PageHeader
import figma from 'figma'
const instance = figma.selectedInstance

const titleLayer = instance.findText('Selling')
const title = titleLayer && titleLayer.type === 'TEXT' ? titleLayer.textContent : 'Title'

export default {
  example: figma.code`<PageHeader title={${JSON.stringify(title)}} onBack={() => { /* Navigate back in your app. */ }} />`,
  imports: ['import { PageHeader } from "@figma/pickup-design-system"'],
  id: 'page-header',
  metadata: { nestable: false },
}
