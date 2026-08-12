/* HNBC 社区 - 交互逻辑（磨砂液态玻璃 UI，对接 community-api.js） */
(function () {
  'use strict';
  var API = window.HNCommunity;
  var state = { board: 'all', page: 1, posting: false, tab: 'forum' };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function avatarHtml(a) {
    return a ? '<img src="' + esc(a) + '" alt="" />'
      : '<span style="width:24px;height:24px;border-radius:50%;background:var(--glass-3);display:inline-block"></span>';
  }
  var toastT;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }
  function showBanner(msg) {
    var b = $('banner'); b.textContent = msg; b.style.display = 'block';
    setTimeout(function () { b.style.display = 'none'; }, 5000);
  }

  function iconLike() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>'; }
  function iconCmt() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/></svg>'; }
  function iconBug() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="8" height="8" rx="4"/><path d="M9 8V5M15 8V5M9 16v3M15 16v3M8 12H5M19 12h-3"/></svg>'; }
  function iconMail() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>'; }

  // ---------- 主题（导航栏主题按钮由 community.html 内联脚本接管，这里同步社区页底色） ----------
  (function () {
    var KEY = 'naling-theme';
    var t = null; try { t = localStorage.getItem(KEY); } catch (e) { }
    if (!t) t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  })();

  // ---------- 用户区 / 登录入口 ----------
  function openLogin() {
    var hero = $('hero');
    if (hero) hero.hidden = true;  // 登录时必须把 hero 收掉，否则 hero(z-index 125) 会盖在 modal-mask(z-index 200) 上层穿透
    $('loginMask').classList.add('show');
    $('loginErr').textContent = '';
  }
  function renderUser() {
    // 同步「个人」dock 角标：未登录显示红点提示登录
    var meTab = document.querySelector('.dock-tab[data-tab="me"]');
    if (meTab) meTab.classList.toggle('has-dot', !API.isLogin());
  }

  // ---------- 导航（顶部版块 + 底部药丸 dock 联动） ----------
  // dock -> 顶部版块映射
  var DOCK_MAP = { forum: 'all', announce: 'announce', xianna: 'xianna' };

  function setActiveDock(name) {
    [].forEach.call(document.querySelectorAll('.dock-tab'), function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === name);
    });
  }
  function setBoard(board, dockTab) {
    state.board = board; state.page = 1;
    state.tab = dockTab || 'forum';
    // 顶部版块高亮
    [].forEach.call(document.querySelectorAll('.board-tab'), function (t) {
      t.classList.toggle('active', t.getAttribute('data-board') === board);
    });
    setActiveDock(state.tab);
    applyGate();
    // 论坛且未登录：P1 拦截，不渲染任何文章
    if (state.tab === 'forum' && !API.isLogin()) {
      $('listArea').innerHTML = '';
      $('countLabel').textContent = '';
      return;
    }
    renderList();
  }

  [].forEach.call(document.querySelectorAll('.board-tab'), function (tab) {
    tab.addEventListener('click', function () {
      setBoard(tab.getAttribute('data-board'), tab.getAttribute('data-board') === 'announce' ? 'announce' : 'forum');
    });
  });

  // 进入「论坛」：未登录 → 全屏 P1 拦截，文章完全不渲染；已登录 → 展示文章
  function enterForum() {
    setBoard('all', 'forum');
  }

  [].forEach.call(document.querySelectorAll('.dock-tab'), function (tab) {
    tab.addEventListener('click', function () {
      var which = tab.getAttribute('data-tab');
      if (which === 'me') { openMe(); return; }   // 未登录 → 弹登录框
      if (which === 'xianna') { openXianna(); return; }
      setBoard(DOCK_MAP[which] || 'all', which);
    });
  });

  // ---------- 列表 ----------
  function renderList() {
    var area = $('listArea');
    area.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    API.listPosts(state.board, state.page, 12).then(function (r) {
      if (!r.ok) { renderListFallback(); return; }
      var list = r.data || [];
      if (!list.length) { area.innerHTML = emptyHtml('none'); return; }
      renderCards(area, list);
    }).catch(function () { renderListFallback(); });
  }
  // 后端未部署 / 网络异常：直接展示空状态，不再使用本地写死示例
  function renderListFallback() {
    var area = $('listArea');
    area.innerHTML = emptyHtml('fail');
    $('countLabel').textContent = '';
  }
  function renderCards(area, list) {
    area.innerHTML = '<div class="grid">' + list.map(cardHtml).join('') + '</div>';
    [].forEach.call(area.querySelectorAll('.card'), function (c) {
      c.addEventListener('click', function () { openDetail(c.getAttribute('data-id')); });
    });
  }

  function cardHtml(p) {
    return '<div class="card glass" data-id="' + esc(p.id) + '">' +
      '<span class="tag ' + esc(p.board) + '">' + esc(p.boardName) + '</span>' +
      (p.title ? '<h3>' + esc(p.title) + '</h3>' : '') +
      '<p class="sum">' + esc(p.summary || p.content) + '</p>' +
      '<div class="meta">' + avatarHtml(p.avatar) +
      '<span class="nm">' + esc(p.nickname) + '</span>' +
      '<span>· ' + esc(p.timeAgo) + '</span>' +
      '<span class="acts"><span>' + iconLike() + esc(p.likeCount) + '</span><span>' + iconCmt() + esc(p.commentCount) + '</span></span>' +
      '</div></div>';
  }
  function emptyHtml(type) {
    if (type === 'none') {
      return '<div class="empty"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6h16M4 12h16M4 18h10"/></svg></div><p>这里还没有内容，来发第一帖吧</p></div>';
    }
    return '<div class="empty"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div><p>加载失败，请确认后端已部署</p></div>';
  }

  // ---------- 加入我们（投递简历） ----------
  // ---------- 献纳（加入我们 / 反馈意见，合并为一个入口） ----------
  function openXianna() {
    state.tab = 'xianna';
    setActiveDock('xianna');
    applyGate();
    $('listArea').innerHTML =
      '<div class="grid"><div class="card glass xianna-card" style="grid-column:1/-1">' +
      '<h3>献纳</h3>' +
      '<p class="sum">欢迎加入我们，也欢迎随时反馈建议。该模块建设中，可先通过以下方式联系：</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">' +
      '<a class="btn btn-primary" href="mailto:' + esc(API.recruitEmail) + '?subject=HNBC加入投递">加入我们（' + esc(API.recruitEmail) + '）</a>' +
      '<a class="btn btn-ghost" href="' + esc(API.githubIssueUrl) + '" target="_blank" rel="noopener">反馈意见（GitHub Issue）</a>' +
      '</div></div></div>';
    $('countLabel').textContent = '';
  }

  // ---------- 个人面板 ----------
  function openMe() {
    if (!API.isLogin()) { openLogin(); return; }
    var p = API.getProfile() || {};
    var initial = (p.nickname || p.email || '?').charAt(0).toUpperCase();
    var avHtml = p.avatar
      ? '<img class="avatar" src="' + esc(p.avatar) + '" alt="" />'
      : '<div class="avatar-ph">' + esc(initial) + '</div>';
    var adminRow = p.isAdmin
      ? '<button class="btn btn-ghost" id="meAdmin" style="flex:1;justify-content:center">成员管理</button>'
      : '';
    $('meBody').innerHTML =
      avHtml +
      '<div class="nick">' + esc(p.nickname || '未命名用户') + '</div>' +
      '<div class="eml">' + esc(p.email) + '</div>' +
      '<div class="stat"><div><b>' + esc(p.postCount || 0) + '</b><span>帖子</span></div>' +
      '<div><b>' + esc(p.commentCount || 0) + '</b><span>评论</span></div>' +
      '<div><b>' + (p.isAdmin ? '管理员' : '成员') + '</b><span>身份</span></div></div>' +
      '<div class="row">' +
      '<button class="btn btn-ghost" id="meProfile" style="flex:1;justify-content:center">编辑资料</button>' +
      (adminRow ? adminRow : '<button class="btn btn-primary" id="meLogout" style="flex:1;justify-content:center">退出登录</button>') +
      '</div>' +
      (adminRow ? '<div class="row" style="margin-top:10px"><button class="btn btn-primary" id="meLogout" style="flex:1;justify-content:center">退出登录</button></div>' : '');
    $('meMask').classList.add('show');
    $('meLogout').addEventListener('click', function () {
      API.logout(); $('meMask').classList.remove('show'); renderUser(); toast('已退出登录'); enterForum();
    });
    $('meProfile').addEventListener('click', openEdit);
    var meAdmin = $('meAdmin');
    if (meAdmin) meAdmin.addEventListener('click', function () { $('meMask').classList.remove('show'); openAdmin(); });
  }

  // ---------- 成员管理（仅管理员） ----------
  function openAdmin() {
    $('adminAddErr').textContent = '';
    $('adminAddEmail').value = '';
    $('adminList').innerHTML = '<div class="hint">加载中…</div>';
    $('adminMask').classList.add('show');
    API.adminList().then(function (r) {
      if (!r.ok) { $('adminList').innerHTML = '<div class="err">' + esc(r.error || '加载失败') + '</div>'; return; }
      var list = r.admins || [];
      if (!list.length) { $('adminList').innerHTML = '<div class="hint">暂无其他管理员</div>'; return; }
      $('adminList').innerHTML = list.map(function (a) {
        return '<div class="admin-list-item"><span class="em">' + esc(a.mask) + (a.isPrimary ? ' <span class="badge">主管理员</span>' : '') + '</span></div>';
      }).join('');
    });
  }
  $('adminClose').addEventListener('click', function () { $('adminMask').classList.remove('show'); });
  $('adminMask').addEventListener('click', function (e) { if (e.target === $('adminMask')) $('adminMask').classList.remove('show'); });
  $('adminAddBtn').addEventListener('click', function () {
    var email = $('adminAddEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('adminAddErr').textContent = '请输入有效邮箱'; return; }
    $('adminAddErr').textContent = '';
    API.adminAdd(email).then(function (r) {
      if (r.ok) { toast('已添加管理员'); openAdmin(); }
      else $('adminAddErr').textContent = r.error || '添加失败';
    });
  });

  // ---------- 编辑资料 ----------
  function openEdit() {
    var p = API.getProfile() || {};
    $('editNick').value = p.nickname || '';
    $('editAvatar').value = p.avatar || '';
    $('editAvatarPreview').src = p.avatar || 'https://furrynaling-1313163196.cos.ap-guangzhou.myqcloud.com/hnbc-static/default-avatar.png';
    $('editErr').textContent = '';
    $('editMask').classList.add('show');
  }
  // 选择本地头像：读成 dataURL → 上传云存储 → 回填 URL
  $('editAvatarFile').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { $('editErr').textContent = '图片不能超过 2MB'; this.value = ''; return; }
    var rd = new FileReader();
    rd.onload = function () {
      $('editAvatarPreview').src = rd.result;
      $('editAvatar').value = '上传中…';
      API.uploadAvatar(rd.result).then(function (r) {
        if (r.ok) { $('editAvatar').value = r.url; $('editAvatarPreview').src = r.url; }
        else { $('editErr').textContent = r.error || '上传失败'; $('editAvatar').value = ''; }
      }).catch(function () { $('editErr').textContent = '上传失败，请重试'; $('editAvatar').value = ''; });
    };
    rd.readAsDataURL(f);
  });
  $('editClose').addEventListener('click', function () { $('editMask').classList.remove('show'); });
  $('editMask').addEventListener('click', function (e) { if (e.target === $('editMask')) $('editMask').classList.remove('show'); });
  $('editSubmit').addEventListener('click', function () {
    var nick = $('editNick').value.trim();
    var av = $('editAvatar').value.trim();
    if (!nick) { $('editErr').textContent = '昵称不能为空'; return; }
    if (av && av !== '上传中…' && !/^https?:\/\//.test(av)) { $('editErr').textContent = '头像需为图片 URL 或先上传本地图片'; return; }
    if (av === '上传中…') { $('editErr').textContent = '头像上传中，请稍候'; return; }
    API.updateProfile(nick, av).then(function (r) {
      if (r.ok) {
        $('editMask').classList.remove('show');
        toast('资料已更新');
        if (API.isLogin()) openMe();   // 刷新个人面板
      } else {
        $('editErr').textContent = r.error || '保存失败';
      }
    });
  });
  $('meClose').addEventListener('click', function () { $('meMask').classList.remove('show'); });
  $('meMask').addEventListener('click', function (e) { if (e.target === $('meMask')) $('meMask').classList.remove('show'); });

  // ---------- 详情 ----------
  function openDetail(id) {
    $('detailBody').innerHTML = '<div class="skeleton" style="height:200px"></div>';
    $('detailMask').classList.add('show');
    API.postDetail(id).then(function (r) {
      if (!r.ok) {
        $('detailBody').innerHTML = '<p class="err">' + esc(r.error || '加载失败') + '</p>';
        return;
      }
      var p = r.post;
      var actions = '';
      if (p.board === 'feedback') actions += '<a class="btn btn-ghost" href="' + API.githubIssueUrl + '" target="_blank" rel="noopener">' + iconBug() + '跳转 GitHub Issue 反馈</a>';
      if (p.board === 'recruit') actions += '<a class="btn btn-ghost" href="mailto:' + API.recruitEmail + '?subject=HNBC招新投递">' + iconMail() + '投递入口（' + esc(API.recruitEmail) + '）</a>';
      $('detailBody').innerHTML =
        '<span class="tag ' + esc(p.board) + '">' + esc(p.boardName) + '</span>' +
        '<h2>' + esc(p.title || '(无标题)') + '</h2>' +
        '<p class="sub">' + avatarHtml(p.avatar) + ' ' + esc(p.nickname) + ' · ' + esc(p.timeAgo) + ' · ' + esc(p.likeCount) + ' 赞 · ' + esc(p.commentCount) + ' 评论</p>' +
        '<div class="detail-content">' + esc(p.content) + '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
        '<button class="btn btn-ghost" id="likeBtn">' + iconLike() + '<span id="likeTxt">赞 ' + esc(p.likeCount) + '</span></button>' + actions + postDeleteBtn(p, true) +
        '</div>' +
        '<div class="comments" id="commentsArea"></div>';

      bindDelPost(p.id);
      $('likeBtn').addEventListener('click', function () {
        if (!API.isLogin()) { openLogin(); return; }
        API.like(p.id).then(function (lr) {
          if (lr.ok) { $('likeTxt').textContent = (lr.liked ? '已赞 ' : '赞 ') + lr.likeCount; toast(lr.liked ? '已点赞' : '已取消点赞'); }
          else toast(lr.error || '操作失败');
        });
      });
      renderComments(r.comments, p.id);
    });
  }
  function renderDetail(p, comments) {
    var isFeedback = p.board === 'feedback';
    var isRecruit = p.board === 'recruit';
    var actions = '';
    if (isFeedback) actions += '<a class="btn btn-ghost" href="' + API.githubIssueUrl + '" target="_blank" rel="noopener">' + iconBug() + '跳转 GitHub Issue 反馈</a>';
    if (isRecruit) actions += '<a class="btn btn-ghost" href="mailto:' + API.recruitEmail + '?subject=HNBC招新投递">' + iconMail() + '投递入口（' + esc(API.recruitEmail) + '）</a>';
    $('detailBody').innerHTML =
      '<span class="tag ' + esc(p.board) + '">' + esc(p.boardName) + '</span>' +
      '<h2>' + esc(p.title || '(无标题)') + '</h2>' +
      '<p class="sub">' + avatarHtml(p.avatar) + ' ' + esc(p.nickname) + ' · ' + esc(p.timeAgo) + ' · ' + esc(p.likeCount) + ' 赞 · ' + esc(p.commentCount) + ' 评论</p>' +
      '<div class="detail-content">' + esc(p.content) + '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
        '<button class="btn btn-ghost" id="likeBtn">' + iconLike() + '<span id="likeTxt">赞 ' + esc(p.likeCount) + '</span></button>' + actions + postDeleteBtn(p, false) +
        '</div>' +
        '<div class="comments" id="commentsArea"></div>';
    bindDelPost(p.id);
    $('likeBtn').addEventListener('click', function () {
      if (!API.isLogin()) { openLogin(); return; }
      toast('示例模式下点赞仅本地预览');
    });
    renderComments(comments, p.id);
  }
  function renderComments(comments, postId) {
    var area = $('commentsArea');
    if (!area) return;
    var me = API.getProfile() || {};
    var admin = !!me.isAdmin;
    var html = (comments || []).map(function (c) {
      var canDel = admin || c.mine;
      var del = canDel ? '<button class="del-link" data-cmt="' + esc(c.id) + '">删除</button>' : '';
      return '<div class="comment">' + avatarHtml(c.avatar) +
        '<div class="body"><div><span class="nm">' + esc(c.nickname) + '</span><span class="ct">' + esc(c.timeAgo) + '</span></div>' +
        '<div class="tx">' + esc(c.content) + '</div>' + del + '</div></div>';
    }).join('');
    if (API.isLogin()) {
      html += '<div class="comment-form"><input type="text" id="cmtInput" placeholder="友善发言，理性讨论..." /><button class="btn btn-primary" id="cmtSend">发送</button></div>';
    } else {
      html += '<p class="hint" style="margin-top:12px"><a href="javascript:;" id="cmtLogin" style="color:var(--primary)">登录后参与评论</a></p>';
    }
    area.innerHTML = html;
    // 绑定评论删除
    [].forEach.call(area.querySelectorAll('.del-link[data-cmt]'), function (b) {
      b.addEventListener('click', function () {
        var cid = b.getAttribute('data-cmt');
        if (!confirm('确定删除这条评论？')) return;
        API.deleteComment(cid).then(function (r) {
          if (r.ok) { toast('已删除'); openDetail(postId); }
          else toast(r.error || '删除失败');
        });
      });
    });
    if (API.isLogin()) {
      $('cmtSend').addEventListener('click', function () {
        var v = $('cmtInput').value.trim();
        if (!v) { toast('评论不能为空'); return; }
        API.addComment(postId, v).then(function (cr) {
          if (cr.ok) { toast('评论成功'); openDetail(postId); }
          else if (cr.blocked) toast('评论被拦截：' + (cr.reason || '违规内容'));
          else toast(cr.error || '评论失败');
        });
      });
    } else {
      var cl = $('cmtLogin'); if (cl) cl.addEventListener('click', openLogin);
    }
  }
  // 帖子详情里的删除按钮（管理员或本人）
  function postDeleteBtn(p, apiOk) {
    var me = API.getProfile() || {};
    var canDel = !!me.isAdmin || (apiOk && p.mine);
    if (!canDel) return '';
    return '<button class="btn btn-ghost" id="delPostBtn">删除帖子</button>';
  }
  function bindDelPost(postId) {
    var btn = $('delPostBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!confirm('确定删除这篇帖子？该操作不可恢复')) return;
      API.deletePost(postId).then(function (r) {
        if (r.ok) { $('detailMask').classList.remove('show'); toast('已删除'); renderList(); }
        else toast(r.error || '删除失败');
      });
    });
  }
  $('detailClose').addEventListener('click', function () { $('detailMask').classList.remove('show'); });
  $('detailMask').addEventListener('click', function (e) { if (e.target === $('detailMask')) $('detailMask').classList.remove('show'); });

  // ---------- 登录 ----------
  $('loginClose').addEventListener('click', function () { $('loginMask').classList.remove('show'); applyGate(); });
  $('loginMask').addEventListener('click', function (e) { if (e.target === $('loginMask')) { $('loginMask').classList.remove('show'); applyGate(); } });
  // 获取验证码：点击立即开始 60 秒前端倒计时（纯前端展示，乐观 UI，不等后端返回）
  var codeLeft = 0, codeTimer = null;
  function startCodeCountdown(sec) {
    var btn = $('sendCodeBtn');
    if (codeTimer) clearInterval(codeTimer);
    codeLeft = sec; btn.disabled = true;
    btn.textContent = codeLeft + ' 秒后重试';
    codeTimer = setInterval(function () {
      codeLeft--;
      if (codeLeft <= 0) { clearInterval(codeTimer); codeTimer = null; btn.disabled = false; btn.textContent = '获取验证码'; }
      else btn.textContent = codeLeft + ' 秒后重试';
    }, 1000);
  }
  function stopCodeCountdown() {
    if (codeTimer) { clearInterval(codeTimer); codeTimer = null; }
    codeLeft = 0;
    var btn = $('sendCodeBtn'); btn.disabled = false; btn.textContent = '获取验证码';
  }
  $('sendCodeBtn').addEventListener('click', function () {
    if (codeLeft > 0) return;                 // 倒计时中，禁止重复触发（前端频率限制）
    var email = $('loginEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('loginErr').textContent = '请输入有效邮箱'; return; }
    // 点击即立即弹出倒计时（纯前端），无需等待后端响应
    startCodeCountdown(60);
    API.sendCode(email).then(function (r) {
      if (r.ok) {
        toast('验证码已发送，10 分钟内有效');
      } else {
        stopCodeCountdown();                  // 发送失败：恢复按钮可点击，重新输入
        $('loginErr').textContent = r.error || '发送失败';
      }
    }).catch(function () {
      stopCodeCountdown();
      $('loginErr').textContent = '网络错误，请确认后端已部署';
    });
  });
  $('loginSubmit').addEventListener('click', function () {
    var email = $('loginEmail').value.trim();
    var code = $('loginCode').value.trim();
    if (!email || !code) { $('loginErr').textContent = '请填写邮箱和验证码'; return; }
    API.login(email, code).then(function (r) {
      if (r.ok) {
        $('loginMask').classList.remove('show');
        renderUser();
        toast('登录成功');
        enterForum();
        dismissGate();
      }
      else $('loginErr').textContent = r.error || '登录失败';
    });
  });

  // ---------- 发帖 ----------
  function openPost() {
    if (!API.isLogin()) { openLogin(); return; }
    var p = API.getProfile() || {};
    var sel = $('postBoard');
    var opts = [['discuss', '讨论区'], ['feedback', '问题反馈'], ['recruit', '招新板块']];
    if (p.isAdmin) opts.unshift(['announce', '官方公告（管理员）']);
    sel.innerHTML = opts.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
    $('postTitle').value = ''; $('postContent').value = ''; $('postErr').textContent = '';
    $('postMask').classList.add('show');
    syncTitleField();
  }
  function syncTitleField() {
    $('titleField').style.display = ($('postBoard').value === 'feedback') ? 'none' : 'block';
  }
  $('postBoard').addEventListener('change', syncTitleField);
  $('postClose').addEventListener('click', function () { $('postMask').classList.remove('show'); });
  $('postMask').addEventListener('click', function (e) { if (e.target === $('postMask')) $('postMask').classList.remove('show'); });
  // 右下角悬浮发布按钮（X 风格加号）
  $('fabBtn').addEventListener('click', openPost);
  $('postSubmit').addEventListener('click', function () {
    if (state.posting) return;
    var board = $('postBoard').value;
    var title = $('postTitle').value.trim();
    var content = $('postContent').value.trim();
    if (board !== 'feedback' && !title) { $('postErr').textContent = '请填写标题'; return; }
    if (!content) { $('postErr').textContent = '请填写内容'; return; }
    state.posting = true; $('postErr').textContent = '';
    API.createPost(board, title, content).then(function (r) {
      state.posting = false;
      if (r.ok) { $('postMask').classList.remove('show'); toast('发布成功'); state.board = board; renderList(); }
      else if (r.blocked) { $('postErr').textContent = '内容被拦截：' + (r.reason || '违规内容'); }
      else { $('postErr').textContent = r.error || '发布失败'; }
    });
  });

  // ---------- P1 落地页（仅论坛 + 未登录时全屏拦截；公告/加入我们/反馈意见不显示） ----------
  function applyGate() {
    var hero = $('hero'), fab = $('fabBtn'), wrap = $('wrap');
    var showHero = (state.tab === 'forum') && !API.isLogin();
    if (hero) {
      hero.classList.remove('hero-out');
      hero.hidden = !showHero;
    }
    if (wrap) wrap.style.visibility = showHero ? 'hidden' : '';
    document.body.style.overflow = showHero ? 'hidden' : '';
    if (fab) fab.classList.toggle('hidden', !API.isLogin());
  }
  // 登录成功：P1 淡出，文章淡入
  function dismissGate() {
    var hero = $('hero'), wrap = $('wrap');
    if (wrap) wrap.style.visibility = '';
    document.body.style.overflow = '';
    if (hero && !hero.hidden) {
      hero.classList.add('hero-out');
      setTimeout(function () { hero.hidden = true; hero.classList.remove('hero-out'); }, 450);
    }
    if (wrap) {
      wrap.classList.remove('content-in');
      void wrap.offsetWidth;
      wrap.classList.add('content-in');
    }
  }
  var heroLogin = $('heroLogin');
  if (heroLogin) heroLogin.addEventListener('click', openLogin);

  // ---------- 启动 ----------
  renderUser();
  enterForum();   // 默认论坛：未登录全屏 P1 拦截，已登录渲染文章
})();
