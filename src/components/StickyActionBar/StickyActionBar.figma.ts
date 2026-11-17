// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=66-446
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/StickyActionBar/StickyActionBar.tsx
// component=StickyActionBar
import figma from 'figma'
const instance = figma.selectedInstance

const saveLayer = instance.findText('Save')
const save = saveLayer && saveLayer.type === 'TEXT' ? saveLayer.textContent : 'Save'
const buyLayer = instance.findText('Buy now')
const buy = buyLayer && buyLayer.type === 'TEXT' ? buyLayer.textContent : 'Buy now'

export default {
  example: figma.code`<StickyActionBar>
  <Button variant="outline">{${JSON.stringify(save)}}</Button>
  <Button>{${JSON.stringify(buy)}}</Button>
</StickyActionBar>`,
  imports: ['import { Button, StickyActionBar } from "@figma/pickup-design-system"'],
  id: 'sticky-action-bar',
  metadata: { nestable: false },
}
