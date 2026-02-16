import { createApp } from './app'
import { env } from './config/env'

const app = createApp()
const port = env.PORT

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on http://localhost:${port}`)
})
