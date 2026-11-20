// SCG Mail 1.0 Institutional — shared HTML for opt-in platform notifications.
// The original SCG logo is the existing /assets/logo.png; no logo regeneration.
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));
const labels: Record<string,string> = {project:'PROJECTS',application:'APPLICATIONS',announcement:'COMMUNITY',post:'NEWS',support:'OPERATIONS'};
export function emailTemplate(title: string, text: string, destination: string, kind = 'project') {
 const t = esc(title), body = esc(text).replace(/\r\n|\r|\n/g,'<br>'), url = esc(destination);
 const category = labels[kind] || 'SCG NOTIFICATION';
 const cta = kind === 'announcement' || kind === 'post' ? 'Открыть новости' : 'Открыть Backstage';
 return [
  '<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">',
  '<title>',t,' | Stage Craft Group</title><style>@media screen and (max-width:620px){.scg-pad{padding-left:22px!important;padding-right:22px!important}.scg-h1{font-size:25px!important}}</style></head>',
  '<body style="margin:0;background-color:#f2f3f4;color:#111;font-family:Helvetica,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f4"><tr><td align="center" style="padding:34px 12px">',
  '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e6e6e8;border-radius:14px">',
  '<tr><td class="scg-pad" style="padding:29px 34px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><img src="https://stagecraft.kz/assets/logo.png" width="148" alt="STAGE CRAFT GROUP" style="display:block;width:148px;max-width:100%;height:auto;border:0"></td><td align="right" style="font-size:9px;line-height:1.6;letter-spacing:1.4px;color:#676767">',
  category,'<br>SCG MAIL 1.0</td></tr></table></td></tr>',
  '<tr><td style="height:8px;line-height:8px;background:#e9eaec;font-size:0">&nbsp;</td></tr>',
  '<tr><td class="scg-pad" style="padding:31px 34px 0"><div style="font-size:10px;font-weight:bold;letter-spacing:2px;color:#777;margin-bottom:14px">',category,'</div><h1 class="scg-h1" style="font-size:29px;font-weight:bold;line-height:1.2;margin:0;letter-spacing:-.5px;color:#111">',t,'</h1></td></tr>',
  '<tr><td class="scg-pad" style="padding:23px 34px 28px;font-size:15px;line-height:1.7;color:#252525">',body,'</td></tr>',
  '<tr><td class="scg-pad" style="padding:0 34px 28px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#111" style="border-radius:9px"><a href="',url,'" style="background:#111;color:#fff;display:inline-block;text-decoration:none;padding:14px 24px;font-size:14px;font-weight:bold;border-radius:9px">',cta,' &nbsp;→</a></td></tr></table>',
  '<p style="font-size:12px;line-height:1.6;color:#777;margin-top:20px">Если кнопка не открылась: <a href="',url,'" style="color:#333;word-break:break-all">',url,'</a></p></td></tr>',
  '<tr><td class="scg-pad" style="padding:0 34px 24px"><div style="border-top:1px solid #e4e4e4;padding-top:18px;font-size:12px;line-height:1.6;color:#666"><b style="color:#111">STAGE CRAFT GROUP</b><br>Уведомление отправлено согласно вашим настройкам.<br><a style="color:#333" href="https://stagecraft.kz/backstage/#settings">Настроить уведомления</a> · <a style="color:#333" href="https://stagecraft.kz/#privacy">Конфиденциальность</a></div></td></tr>',
  '<tr><td class="scg-pad" style="border-top:1px solid #eee;padding:17px 34px;font-size:10px;letter-spacing:1.3px;color:#777">PEOPLE. PROJECTS. CULTURE.</td></tr>',
  '</table></td></tr></table></body></html>'
 ].join('');
}
