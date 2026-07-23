import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { build, webhookUrl } = req.body;

  if (!build || !webhookUrl) {
    return res.status(400).json({ error: 'Missing build data or webhook URL' });
  }

  // SSRF Protection: Only allow legitimate Discord webhook URLs
  const allowedPrefixes = [
    'https://discord.com/api/webhooks/',
    'https://discordapp.com/api/webhooks/',
  ];
  const isAllowedUrl = allowedPrefixes.some(prefix => webhookUrl.startsWith(prefix));
  if (!isAllowedUrl) {
    return res.status(400).json({ error: 'Invalid webhook URL. Only Discord webhook URLs are permitted.' });
  }

  try {
    const embed = {
      title: build.name,
      description: build.description || `A new Predecessor build for ${build.heroName}!`,
      url: `${req.headers.origin}/builds/${build.id}`,
      color: 3899638, // blue-ish
      fields: [
        {
          name: 'Hero',
          value: build.heroName,
          inline: true,
        },
        {
          name: 'Role',
          value: build.role,
          inline: true,
        },
        {
          name: 'Items',
          value: build.items?.join(', ') || 'None',
          inline: false,
        },
        {
          name: 'Crest',
          value: build.crest || 'None',
          inline: true,
        }
      ],
      footer: {
        text: 'Shared from Predecessor Labs',
      },
      timestamp: new Date().toISOString(),
    };

    const discordPayload = {
      content: `Check out this build: **${build.name}**!`,
      embeds: [embed],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      throw new Error(`Discord API responded with status ${response.status}`);
    }

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error sending to Discord:', err);
    res.status(500).json({ error: err.message });
  }
}
