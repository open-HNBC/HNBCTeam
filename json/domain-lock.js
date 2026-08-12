/* domain-lock.js — 域名锁 + 著作权侵权警告（强威慑版 / 中英文可切换）
 * ---------------------------------------------------------------
 * 本仓库为「开源前端」，任何人都能下载、改 JS、本地起服务。
 * 因此本脚本只做【版权警示 + 体验拦截】，不是安全边界
 * （攻击者删掉本文件即可绕过——真正的安全在后端云函数里）。
 *
 * 行为：
 *   - 仅在官方域名 openhnbc.com 下：正常渲染，什么都不做。
 *   - 其他域名 / localhost / 127.0.0.1 / file:// 打开：
 *       整页清空，红底白字全屏「侵犯著作权行为警告」，
 *       上下左右居中自适应，右上角可一键切换 简 / EN。
 *
 * 本地调试正常模式：临时把下方 officialDomain 判断加上 'localhost' 即可，部署前移回。
 */
(function () {
  'use strict';

  var proto = window.location.protocol;
  var host = window.location.hostname;
  var officialDomains = ['openhnbc.com', 'openhnbc.cn'];

  // 版权提示：只要浏览器访问域名里包含任一官方域名即放行（含任意子域/近似域名）；其余弹警告。
  if (officialDomains.some(function (d) { return host.indexOf(d) !== -1; })) return;

  document.documentElement.innerHTML = '';
  document.documentElement.style.margin = '0';
  document.documentElement.style.padding = '0';
  document.documentElement.style.height = '100%';

  document.body = document.createElement('body');
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.minHeight = '100vh';
  document.body.style.backgroundColor = '#FF0000';
  document.body.style.color = '#ffffff';
  document.body.style.fontFamily = 'system-ui, sans-serif';
  document.body.style.boxSizing = 'border-box';
  // 上下左右居中自适应
  document.body.style.display = 'flex';
  document.body.style.alignItems = 'center';
  document.body.style.justifyContent = 'center';
  document.body.style.padding = '16px 12px';
  document.body.style.overflowY = 'auto';

  var wrap = document.createElement('div');
  wrap.style.maxWidth = '780px';
  wrap.style.width = '100%';
  wrap.style.margin = '0 auto';
  wrap.style.textAlign = 'center';

  // 头部大标题（中英共用，随语言走）
  function build(lang) {
    var intro = lang === 'en'
      ? (proto === 'file:'
          ? 'Detected local file double-click opening (file:// protocol).'
          : 'Detected running project copy via Node.js / Python / Nginx or other third-party server.')
      : (proto === 'file:'
          ? '检测到本地文件双击打开(file://协议)'
          : '检测到使用 Node.js / Python / Nginx 等第三方服务运行本项目副本');

    if (lang === 'en') {
      return ''
        + '<h1 style="margin:0 0 12px 0;">⚠️COPYRIGHT INFRINGEMENT WARNING⚠️</h1>'
        + '<p style="font-size:15px;line-height:1.6;margin-top:0;">' + intro + '</p>'
        + '<p style="font-size:14px;line-height:1.6;margin-top:10px;text-align:left;">'
        + '<strong>📜Violated agreements &amp; laws:</strong><br>'
        + '1. PolyForm-Strict-1.0.0 Open Source License: Local execution, redistribution, private deployment, mirroring, and forking are prohibited;<br>'
        + '2. Copyright Law of the People\'s Republic of China Article 10: Copyright owners have the rights of reproduction, information network communication, adaptation, and modification. No individual or organization may exercise these rights without permission;<br>'
        + '3. Copyright Law of the People\'s Republic of China Article 53: Unauthorized reproduction or public provision of works constitutes copyright infringement and shall bear civil legal liability.'
        + '</p>'
        + '<p style="font-size:14px;line-height:1.6;margin-top:10px;text-align:left;">'
        + '<strong>⛔Immediately cease the following operations:</strong><br>'
        + '1. Directly opening via local file protocol or running source files with Node.js, Python, etc.;<br>'
        + '2. Authorized copying, saving of pages, resources, source code;<br>'
        + '3. Private mirroring, offline deployment, secondary distribution.'
        + '</p>'
        + '<p style="font-size:14px;line-height:1.6;margin-top:10px;text-align:left;">'
        + '<strong>⚡Actions we will take:</strong><br>'
        + '1. Demand immediate cessation of infringement and deletion of all copies, caches, and mirror files;<br>'
        + '2. Evidence preservation, web notarization, screen recording to fully preserve infringing evidence;<br>'
        + '3. Send written cease-and-desist notices to infringers;<br>'
        + '4. File complaints with platforms and service providers to remove infringing content;<br>'
        + '5. Legal action through administrative and judicial channels against non-compliant parties.'
        + '</p>'
        + '<p style="margin-top:12px;font-size:14px;"> Image content (Naling) registration: <strong>Ganzuo Dengzi-2026-F-00078545</strong></p>'
        + '<p style="margin-top:4px;font-size:15px;">Only official authorized domains：<strong>openhnbc.com</strong> / <strong>openhnbc.cn</strong></p>'
        + '<a href="https://openhnbc.com" target="_blank" rel="noopener" '
        + 'style="display:inline-block;margin-top:18px;padding:12px 28px;border-radius:12px;'
        + 'text-decoration:none;background:#fff;color:#FF0000;font-weight:700;font-size:15px;">'
        + '前往官方网站 / Visit Official Site</a>';
    }

    // 中文（默认）
    return ''
      + '<h1 style="margin:0 0 12px 0;">⚠️侵犯著作权行为警告⚠️</h1>'
      + '<p style="font-size:15px;line-height:1.6;margin-top:0;">' + intro + '</p>'
      + '<p style="font-size:14px;line-height:1.6;margin-top:10px;text-align:left;">'
      + '<strong>📜违反协议与法律条目：</strong><br>'
      + '1. PolyForm-Strict-1.0.0 开源许可协议：禁止本地运行、二次分发、私有部署副本、镜像复刻等行为；<br>'
      + '2. 《中华人民共和国著作权法》第十条：著作权人依法享有复制权、信息网络传播权、改编权、修改权，任何单位、个人不得未经许可实施以上行为。<br>'
      + '3. 《中华人民共和国著作权法》第五十三条：未经著作权人许可复制、向公众提供作品，构成著作权侵权，应当承担民事法律责任。'
      + '</p>'
      + '<p style="font-size:14px;line-height:1.6;margin-top:10px;text-align:left;">'
      + '<strong>⛔请立刻停止以下操作</strong><br>'
      + '1. 通过本地 file 协议直接打开、或使用 Node.js、Python 等运行本项目源码文件；<br>'
      + '2. 授权复制、保存本项目页面、资源、源码；<br>'
      + '3. 私自搭建私有镜像、离线部署、二次分发本项目内容。'
      + '</p>'
      + '<p style="font-size:14px;line-height:1.6;margin-top:10px;text-align:left;">'
      + '<strong>⚡我方将采取的行动</strong><br>'
      + '1. 要求侵权方立即停止侵害，删除全部侵权副本、缓存、镜像文件；<br>'
      + '2. 对侵权行为进行证据固定、网页公证、录屏取证，完整留存侵权证据；<br>'
      + '3. 向侵权行为人发送书面侵权告知函，要求限期删除全部侵权资源；<br>'
      + '4. 拒不整改的，将向网络平台、服务商发起投诉，下架全部侵权内容；<br>'
      + '5. 对拒不停止侵权行为的主体，将依法提交行政、司法途径处理，追究相应法律责任。'
      + '</p>'
      + '<p style="margin-top:12px;font-size:14px;"> 图片内容（纳棂）登记号：<strong>赣作登字-2026-F-00078545</strong></p>'
      + '<p style="margin-top:4px;font-size:15px;">唯一合法访问域名：<strong>openhnbc.com</strong> / <strong>openhnbc.cn</strong></p>'
      + '<a href="https://openhnbc.com" target="_blank" rel="noopener" '
      + 'style="display:inline-block;margin-top:18px;padding:12px 28px;border-radius:12px;'
      + 'text-decoration:none;background:#fff;color:#FF0000;font-weight:700;font-size:15px;">'
      + '前往官方网站</a>';
  }

  // 右上角 简 / EN 切换
  var lang = 'zh';
  var toggle = document.createElement('div');
  toggle.style.position = 'fixed';
  toggle.style.top = '12px';
  toggle.style.right = '12px';
  toggle.style.display = 'flex';
  toggle.style.gap = '6px';
  toggle.style.zIndex = '2147483647';
  toggle.style.fontFamily = 'system-ui, sans-serif';
  toggle.style.fontSize = '14px';
  toggle.style.fontWeight = '700';

  function makeBtn(key, label) {
    var b = document.createElement('span');
    b.textContent = label;
    b.style.cursor = 'pointer';
    b.style.padding = '4px 12px';
    b.style.borderRadius = '8px';
    b.style.border = '1px solid rgba(255,255,255,.6)';
    b.style.color = '#fff';
    b.style.userSelect = 'none';
    b.setAttribute('data-lang', key);
    b.addEventListener('click', function () {
      lang = key;
      wrap.innerHTML = build(lang);
      syncToggle();
    });
    return b;
  }
  var btnZh = makeBtn('zh', '简');
  var btnEn = makeBtn('en', 'EN');
  toggle.appendChild(btnZh);
  toggle.appendChild(btnEn);

  function syncToggle() {
    [btnZh, btnEn].forEach(function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.style.background = on ? '#fff' : 'transparent';
      b.style.color = on ? '#FF0000' : '#fff';
    });
  }

  wrap.innerHTML = build(lang);
  document.body.appendChild(wrap);
  document.documentElement.appendChild(document.body);
  document.documentElement.appendChild(toggle);
  syncToggle();
})();
