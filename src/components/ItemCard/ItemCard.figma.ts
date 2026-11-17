// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=110-125
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/ItemCard/ItemCard.tsx
// component=ItemCard
import figma from 'figma'
const instance = figma.selectedInstance

const title = instance.getString('Title')
const price = instance.getString('Price')
const distance = instance.getString('Distance')
const image = instance.getSlot('Product image')
// ItemCard owns the Badge rendering; its condition prop takes the child's label.
const badge = instance.findInstance('Badge')
const condition = badge && badge.type === 'INSTANCE' ? badge.getString('Label') : undefined

export default {
  example: figma.code`<ItemCard
  title={${JSON.stringify(title)}}
  price={${JSON.stringify(price)}}
  distance={${JSON.stringify(distance)}}${condition ? `
  condition={${JSON.stringify(condition)}}` : ''}
${image ? figma.code`  image={<>${image}</>}
` : ''}  onSaveToggle={() => { /* Toggle this item in your saved items. */ }}
/>`,
  imports: ['import { ItemCard } from "@figma/pickup-design-system"'],
  id: 'item-card',
  metadata: { nestable: false },
}
