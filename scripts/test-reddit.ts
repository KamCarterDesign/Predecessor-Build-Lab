import * as cheerio from 'cheerio'

async function testReddit() {
  const url = 'https://www.reddit.com/r/PredecessorGame/.rss'
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    })
    console.log('Status:', res.status)
    const xml = await res.text()
    const $ = cheerio.load(xml, { xmlMode: true })

    $('entry').each((_, el) => {
      const title = $(el).find('title').text().trim()
      const link = $(el).find('link').attr('href') || ''
      const updated = $(el).find('updated').text().trim()
      const author = $(el).find('author name').text().trim()
      const contentHtml = $(el).find('content').text()
      const $content = cheerio.load(contentHtml)
      const excerpt = $content('p').first().text().trim() || 'Reddit discussion thread.'
      
      // Look for thumbnail image
      let imageUrl = 'https://www.redditstatic.com/icon.png'
      const img = $content('img')
      if (img.length > 0) {
        imageUrl = img.attr('src') || imageUrl
      }

      console.log('---')
      console.log('Title:', title)
      console.log('Link:', link)
      console.log('Updated:', updated)
      console.log('Author:', author)
      console.log('Excerpt:', excerpt)
      console.log('Image:', imageUrl)
    })
  } catch (err) {
    console.error('Error:', err)
  }
}

testReddit()
