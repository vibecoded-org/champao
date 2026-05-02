// scrape-national-team.ts
import * as cheerio from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type NationalTeamPlayer = {
  nationalNumber: number;
  position: string;
  name: string;
  team: string;
  nationality: string;
  height: number | null;
  weight: number | null;
  age: number | null;
  overall: number | null;
};

type CliOptions = {
  nation: string;
  outDir: string;
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  const nationArg =
    args.find(arg => arg.startsWith('--nation='))?.replace('--nation=', '') ??
    args[0];

  const outDir =
    args.find(arg => arg.startsWith('--out='))?.replace('--out=', '') ??
    './output';

  if (!nationArg) {
    console.error(`
Usage:
  bun run scrape-national-team.ts Brazil
  bun run scrape-national-team.ts "South Korea"
  bun run scrape-national-team.ts --nation=Brazil --out=./data
`);
    process.exit(1);
  }

  return {
    nation: nationArg.trim(),
    outDir,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toNumber(value: string): number | null {
  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return '';

  const text = String(value);

  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(players: NationalTeamPlayer[]): string {
  const headers = [
    'nationalNumber',
    'position',
    'name',
    'team',
    'nationality',
    'height',
    'weight',
    'age',
    'overall',
  ];

  const rows = players.map(player =>
    [
      player.nationalNumber,
      player.position,
      player.name,
      player.team,
      player.nationality,
      player.height,
      player.weight,
      player.age,
      player.overall,
    ]
      .map(csvEscape)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

async function scrapeNationalTeam(nation: string): Promise<NationalTeamPlayer[]> {
  const url = `https://pesdb.net/efootball/?featured=0&nationality=${encodeURIComponent(
    `"${nation}"`
  )}&sort=national_number&order=a`;

  console.log(`Fetching: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch PESDB. Status: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const players: NationalTeamPlayer[] = [];

  $('tr').each((_, row) => {
    const cells = $(row)
      .find('td')
      .map((_, td) => $(td).text().trim())
      .get()
      .filter(Boolean);

    if (cells.length < 9) return;

    const nationalNumber = Number(cells[0]);

    // Only national team players have Squad Number National.
    if (!Number.isFinite(nationalNumber)) return;

    players.push({
      nationalNumber,
      position: cells[1],
      name: cells[2],
      team: cells[3],
      nationality: cells[4],
      height: toNumber(cells[5]),
      weight: toNumber(cells[6]),
      age: toNumber(cells[7]),
      overall: toNumber(cells[8]),
    });
  });

  return players.sort((a, b) => a.nationalNumber - b.nationalNumber);
}

async function main() {
  const { nation, outDir } = parseArgs();

  const players = await scrapeNationalTeam(nation);

  if (players.length === 0) {
    console.error(`No national team players found for: ${nation}`);
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });

  const slug = slugify(nation);

  const csvPath = join(outDir, `${slug}-national-team.csv`);
  const namesPath = join(outDir, `${slug}-national-team-names.txt`);

  const csv = toCsv(players);
  const names = players.map(player => player.name).join('\n');

  await writeFile(csvPath, csv, 'utf8');
  await writeFile(namesPath, names, 'utf8');

  console.log(`Done.`);
  console.log(`Players: ${players.length}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Names: ${namesPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
