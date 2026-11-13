import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.setTimeout(90000);
test.use({deviceScaleFactor:2});
test.beforeEach(async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/tile/**',route=>route.abort());
});
async function ready(page:Page):Promise<void>{
  await expect(page.locator('.analysis-dashboard')).toBeVisible({timeout:60000});
  await expect(page.locator('.feature-host')).not.toHaveAttribute('aria-busy','true',{timeout:60000});
}
async function choose(page:Page,label:string,value:string):Promise<void>{
  await page.locator('#dashboard-filters').getByRole('combobox',{name:label,exact:true}).fill(value);
  await page.getByRole('listbox').getByRole('option').filter({hasText:value}).first().click();
}

test('filters are live on all six tabs, retain selections, and use one divider',async({page})=>{
  await page.goto('/dashboard/rekomendasi-kebijakan');
  const filters=page.locator('#dashboard-filters');await expect(filters).toBeVisible();
  await expect(filters).not.toHaveAttribute('open','');
  await filters.locator('summary').click();await filters.getByRole('button',{name:'PM10',exact:true}).click();
  await choose(page,'Stasiun','AQMS-BJB-01');
  for(const id of ['temporal','drivers','health','overview','compliance','recommendations']){
    await page.locator(`a[data-feature="${id}"]`).click();
    await expect(filters).toBeVisible();await expect(filters).not.toHaveAttribute('open','');
    await expect(filters.locator('.filter-summary')).toContainText('AQMS-BJB-01');await expect(filters.locator('.filter-summary')).toContainText('PM10');
    expect(await page.locator('.filter-host').evaluate(node=>getComputedStyle(node).borderBottomWidth)).toBe('1px');
    await filters.locator('summary').click();await expect(filters.getByRole('combobox',{name:'Stasiun',exact:true})).toBeEnabled();await expect(filters.getByRole('button',{name:'PM10',exact:true})).toBeEnabled();await filters.locator('summary').click();
    if(id==='temporal'||id==='drivers')await ready(page);
  }
});

for(const [name,route] of [['temporal','/dashboard/pola-waktu'],['drivers','/dashboard/faktor-pemicu']] as const){
  test(`${name} filters change actual charts and KPI scope while retaining instances and surviving refresh`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(route);await ready(page);
    const root=page.locator('.analysis-dashboard'),canvas=root.locator('canvas').first();
    if(name==='drivers'){
      await root.getByText('Legenda seri',{exact:true}).click();
      const toggle=root.locator('.analysis-chart-legend button').first();
      await toggle.focus();await toggle.press('Enter');await expect(toggle).toHaveAttribute('aria-pressed','false');
    }
    const original=await canvas.elementHandle();if(!original)throw new Error('Chart missing');
    const before=await root.locator('.metric strong').allTextContents();
    const filters=page.locator('#dashboard-filters');await filters.locator('summary').click();
    await choose(page,'Stasiun','AQMS-MDN-01');await ready(page);
    await expect(root.locator('.analysis-summary')).toContainText('Ringkasan');
    const narrowed=await root.locator('.metric strong').allTextContents();expect(narrowed).not.toEqual(before);
    await page.locator('#filter-date-start').fill('2025-08-01');await page.locator('#filter-date-start').dispatchEvent('change');
    await page.locator('#filter-date-end').fill('2025-08-31');await page.locator('#filter-date-end').dispatchEvent('change');await ready(page);
    await filters.getByRole('button',{name:'CO',exact:true}).click();await ready(page);
    await expect(root).toHaveAttribute('data-pollutant','CO');
    if(name==='temporal')await expect(root.locator('.metric').nth(2)).toContainText('4.000');
    else await expect(root.locator('.metric').nth(2)).toContainText('CO');
    await page.getByLabel('Sertakan data SUSPECT',{exact:true}).check();await ready(page);
    await expect(filters.locator('.filter-summary')).toContainText('VALID + SUSPECT');
    if(name==='temporal')expect(await canvas.evaluate((node,previous)=>node===previous,original)).toBe(true);
    await choose(page,'Stasiun','Semua stasiun');
    await choose(page,'Wilayah','Jakarta');
    await choose(page,'Tipe lokasi','Industrial Perimeter');await ready(page);
    if(name==='temporal')await expect(page.locator('canvas[data-chart="timeseries"]')).toHaveAttribute('aria-label',/1 stasiun/);
    else await expect(root.locator('.rose-title')).toHaveText('AQMS-JKT-02');
    await filters.locator('summary').click();
    await page.reload();await ready(page);expect(errors).toEqual([]);
  });

  test(`${name} summary cards, filters and controls fit desktop and phones in both themes`,async({page})=>{
    await page.goto(route);await ready(page);
    const root=page.locator('.analysis-dashboard');
    for(const width of [1440,1024,768,375,320])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:1000});await page.evaluate(value=>{document.documentElement.dataset['theme']=value;},theme);
      const geometry=await root.evaluate(node=>{
        const cards=node.querySelector('.analysis-summary .analysis-metrics');if(!cards)throw new Error('Grouped metrics missing');
        const children=[...node.children].filter(child=>child.getBoundingClientRect().height>0);
        return {columns:getComputedStyle(cards).gridTemplateColumns.split(' ').length,count:cards.children.length,gaps:children.slice(1).map((child,i)=>child.getBoundingClientRect().top-(children[i]?.getBoundingClientRect().bottom??0)),clipped:[...node.querySelectorAll('.metric-label,.metric-context')].filter(child=>child.scrollWidth>child.clientWidth+1).length};
      });
      expect(geometry.columns).toBe(width>1200?4:width<375?1:2);expect(geometry.count).toBe(4);expect(geometry.clipped).toBe(0);expect(geometry.gaps.every(gap=>gap>=19)).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await expect(page.locator('#dashboard-filters')).toBeVisible();
      if(width===375||width===1440)await page.screenshot({path:`test-results/live-${name}-${width}-${theme}.png`,fullPage:true});
    }
  });
}

test('hourly export failures offer retry, and rapid filter/navigation changes do not render stale results',async({page})=>{
  let fail=true;
  await page.route('**/data/hourly/manifest.json',route=>fail?route.fulfill({status:503,body:'{}'}):route.continue());
  await page.goto('/dashboard/pola-waktu');await expect(page.getByRole('alert')).toContainText('Analisis belum dapat dimuat',{timeout:15000});
  fail=false;await page.getByRole('button',{name:'Coba lagi',exact:true}).click();await ready(page);
  await page.locator('#dashboard-filters summary').click();await choose(page,'Stasiun','AQMS-JMB-02');await ready(page);
  await expect(page.locator('.analysis-dashboard > .empty-state')).toBeVisible();
  await page.getByLabel('Sertakan data SUSPECT',{exact:true}).check();
  await page.locator('a[data-feature="drivers"]').click();
  await page.locator('a[data-feature="health"]').click();
  await expect(page.locator('.health-dashboard')).toBeVisible();await expect(page.locator('.analysis-dashboard')).toHaveCount(0);
});
