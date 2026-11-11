
import fs from 'fs';
import path from 'path';
import { SqliteUser } from './user.js';
const myuser = new SqliteUser();

import templateHelper from './template_helper.js';
import FormHelper from './form_helper.js';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const siteConfigPath = path.join(__dirname, 'config', 'siteConfig.json');
const siteConfigRaw = fs.readFileSync(siteConfigPath);
const SiteConfig = JSON.parse(siteConfigRaw);

function escapeHtml(str) {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function getInitials(firstname, lastname, login) {
	const f = (firstname || '').trim()[0] || '';
	const l = (lastname || '').trim()[0] || '';
	const initials = (f + l).toUpperCase();
	return initials || (login || 'U')[0].toUpperCase();
}

function formatTimeAgo(dateStr) {
	if (!dateStr) return '';
	const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
	const date = new Date(utcStr);
	const now = new Date();
	const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (isNaN(diffSec) || diffSec < 45) return 'Just now';
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h ago`;
	const diffDays = Math.floor(diffHr / 24);
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

class Routes {
	constructor() {
		// Initialize any necessary properties or instances here
	}

	getBannerInsert(theme) {
		if (theme === 'BootstrapLight') {
			return `
				<div class="card border-0 shadow-sm mb-4 overflow-hidden hero-card">
					<div class="row no-gutters align-items-center">
						<div class="col-md-7">
							<img src="/res/sfbanner.jpg" class="img-fluid w-100" alt="Banner">
							<div id="slideshow" class="carousel slide" data-ride="carousel" data-interval="3000">
								<div class="carousel-inner">
									<div class="carousel-item active bg-danger text-white text-center py-2 font-weight-bold">Find lost friends</div>
									<div class="carousel-item bg-success text-white text-center py-2 font-weight-bold">Stay in touch</div>
									<div class="carousel-item bg-primary text-white text-center py-2 font-weight-bold">Play with others</div>
									<div class="carousel-item bg-warning text-dark text-center py-2 font-weight-bold">Reinvent the world</div>
									<div class="carousel-item bg-dark text-white text-center py-2 font-weight-bold">Do something fun</div>
									<div class="carousel-item bg-info text-white text-center py-2 font-weight-bold">Share with others</div>
								</div>
							</div>
						</div>
						<div class="col-md-5 p-4">
							<span class="badge badge-primary text-uppercase px-2 py-1 mb-2 font-weight-bold">Community</span>
							<h3 class="font-weight-bold text-dark mb-1">Login Demo</h3>
							<p class="text-muted mb-0">Let's communicate</p>
						</div>
					</div>
				</div>
			`;
		} else if (theme === 'BootstrapDark') {
			return `
				<div class="card bg-secondary text-white border-0 shadow-sm mb-4 overflow-hidden hero-card">
					<div class="row no-gutters align-items-center">
						<div class="col-md-7">
							<img src="/res/sfbanner.jpg" class="img-fluid w-100" alt="Banner">
							<div id="slideshow" class="carousel slide" data-ride="carousel" data-interval="3000">
								<div class="carousel-inner">
									<div class="carousel-item active bg-danger text-white text-center py-2 font-weight-bold">Find lost friends</div>
									<div class="carousel-item bg-success text-white text-center py-2 font-weight-bold">Stay in touch</div>
									<div class="carousel-item bg-primary text-white text-center py-2 font-weight-bold">Play with others</div>
									<div class="carousel-item bg-warning text-dark text-center py-2 font-weight-bold">Reinvent the world</div>
									<div class="carousel-item bg-dark text-white text-center py-2 font-weight-bold">Do something fun</div>
									<div class="carousel-item bg-info text-white text-center py-2 font-weight-bold">Share with others</div>
								</div>
							</div>
						</div>
						<div class="col-md-5 p-4">
							<span class="badge badge-primary text-uppercase px-2 py-1 mb-2 font-weight-bold">Community</span>
							<h3 class="font-weight-bold text-white mb-1">Login Demo</h3>
							<p class="text-light mb-0" style="opacity: 0.8;">Let's communicate</p>
						</div>
					</div>
				</div>
			`;
		} else if (theme === 'basic') {
			return '';
		} else {
			// bluezone & default
			return `
				<div class="hero-showcase">
					<div class="showcase-visual">
						<div class="banner-frame">
							<img src="/res/sfbanner.jpg" alt="Community Banner">
						</div>
						<div id="slideshow">
							<div style="background-color:#ef4444;color:white">Find lost friends</div>
							<div style="background-color:#10b981;color:white">Stay in touch</div>
							<div style="background-color:#3b82f6;color:white">Play with others</div>
							<div style="background-color:#f59e0b;color:white">Reinvent the world</div>
							<div style="background-color:#1e293b;color:white">Do something fun</div>
							<div style="background-color:#8b5cf6;color:white">Share with others</div>
						</div>
					</div>
					<div class="showcase-content">
						<div class="showcase-badge">Community Network</div>
						<h2>Stay Connected</h2>
						<p>Share updates, connect with friends, and discover what's happening across the community.</p>
					</div>
				</div>
			`;
		}
	}

	async index(ctx) {

		try {
			ctx.session.visitCount = ctx.session.visitCount ? ctx.session.visitCount + 1 : 1;
			console.log(ctx.session.visitCount);
			console.log(ctx.session.user);
			if (ctx.session.user) {
				await this.showMemberArea(ctx);
			} else {
				await this.showLogin(ctx);
			}
		} catch (error) {
			console.error("Error occurred in index route:", error);
			// Handle error
		}
	}

	async showLogin(ctx) {
		try {
			const currentTheme = ctx.session.theme || SiteConfig.default_theme || templateHelper.currentTheme;
			const myvars = {
				sidebar1: templateHelper.render('views/loginform.html', {}),
				content: templateHelper.render('views/welcome.html', {}),
				sidebar1_title: '',
				sidebar2_title: '',
				utility_menu: '',
				main_menu: SiteConfig.main_menu,
				banner_insert: this.getBannerInsert(currentTheme),
				sidebar2: '',
				themepath: '/themes/' + currentTheme,
				site_name: SiteConfig.site_name,
				site_motto: SiteConfig.site_motto,
			};

			const view = templateHelper.render('themes/' + currentTheme + '/index.tpl', myvars);
			ctx.body = view;
		} catch (error) {
			console.error("Error occurred in showLogin route:", error);
			// Handle error
		}
	}

	async showForm(ctx, body = {}, errorMessage = '') {
		try {
			const userInfo = {
				login: body.login || '',
				firstname: body.firstname || '',
				lastname: body.lastname || '',
				email: body.email || '',
				error: errorMessage ? `<div style="color: red; font-weight: bold; margin: 10px 0; padding: 8px; background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px;">${errorMessage}</div>` : ''
			};
			const currentTheme = ctx.session.theme || SiteConfig.default_theme || templateHelper.currentTheme;
			const myvars = {
				sidebar1: 'Join the community. Fill in the form and participate.',
				content: templateHelper.render('views/registerform.html', userInfo),
				sidebar1_title: '',
				sidebar2_title: '',
				utility_menu: ctx.session.user ? SiteConfig.utility_menu : '',
				main_menu: SiteConfig.main_menu,
				banner_insert: '',
				sidebar2: '',
				themepath: '/themes/' + currentTheme,
				site_name: SiteConfig.site_name,
				site_motto: SiteConfig.site_motto,
			};

			const view = templateHelper.render('themes/' + currentTheme + '/index.tpl', myvars);
			ctx.body = view;
		} catch (error) {
			console.error("Error occurred in showForm route:", error);
			// Handle error
		}
	}

	async showMemberArea(ctx) {
		try {
			if (!ctx.session.user) {
				await this.showLogin(ctx);
				return;
			}

			const currentUserId = ctx.session.user.id;
			const host = (ctx.req.headers && ctx.req.headers.host) || 'localhost';
			const url = new URL(ctx.req.url, 'http://' + host);
			const filter = url.searchParams.get('filter') === 'following' ? 'following' : 'all';

			const posts = await myuser.getFeedPosts(currentUserId, filter);
			let postsHtml = '';

			if (!posts || posts.length === 0) {
				const emptyText = filter === 'following'
					? `No posts from people you follow yet. Browse <a href="/people">members</a> to follow someone, or switch to <a href="/?filter=all">For you</a>.`
					: `No posts yet. Be the first to post!`;
				postsHtml = `<div class="empty-feed">${emptyText}</div>`;
			} else {
				posts.forEach(post => {
					const isOwner = currentUserId === post.user_id;
					const initials = getInitials(post.firstname, post.lastname, post.login);
					const safeFirst = escapeHtml(post.firstname);
					const safeLast = escapeHtml(post.lastname);
					const safeLogin = escapeHtml(post.login);
					const safeContent = escapeHtml(post.content);
					const timeStr = formatTimeAgo(post.created_at);

					let deleteBtn = '';
					if (isOwner) {
						deleteBtn = `
							<form method="POST" action="/posts/${post.id}/delete" style="display:inline;margin:0;" onsubmit="return confirm('Delete this post?');">
								<button type="submit" class="btn-post-delete" title="Delete post">✕</button>
							</form>
						`;
					}

					let messageAction = '';
					if (!isOwner) {
						messageAction = `
							<a href="/messages/${encodeURIComponent(post.login)}" class="post-action-btn">
								<span>💬</span> Message
							</a>
						`;
					}

					postsHtml += `
						<article class="post-card">
							<a href="/profile/${encodeURIComponent(post.login)}" class="post-avatar-col">
								<div class="post-avatar">${initials}</div>
							</a>
							<div class="post-main-col">
								<div class="post-header-line">
									<div class="post-byline">
										<a href="/profile/${encodeURIComponent(post.login)}" class="post-author">${safeFirst} ${safeLast}</a>
										<span class="post-handle">@${safeLogin}</span>
										<span class="post-dot">·</span>
										<span class="post-time">${timeStr}</span>
									</div>
									${deleteBtn}
								</div>
								<div class="post-text">${safeContent}</div>
								<div class="post-actions-row">
									${messageAction}
									<a href="/profile/${encodeURIComponent(post.login)}" class="post-action-btn">
										<span>👤</span> Profile
									</a>
								</div>
							</div>
						</article>
					`;
				});
			}

			const currentInitials = getInitials(ctx.session.user.firstname, ctx.session.user.lastname, ctx.session.user.login);
			const feedContent = templateHelper.render('views/feed.html', {
				current_user_avatar: currentInitials,
				current_user_name: escapeHtml(ctx.session.user.firstname || ctx.session.user.login),
				filter_all_active: filter === 'all' ? 'active' : '',
				filter_following_active: filter === 'following' ? 'active' : '',
				posts_stream: postsHtml
			});

			const myvars = {
				sidebar1: '<ul>' + SiteConfig.main_menu + '</ul>',
				content: feedContent,
				sidebar1_title: '',
				sidebar2_title: '',
				utility_menu: SiteConfig.utility_menu,
				main_menu: SiteConfig.main_menu,
				banner_insert: '', // Hidden when logged in!
				sidebar2: '',
				themepath: '/themes/' + (ctx.session.theme || SiteConfig.default_theme || templateHelper.currentTheme),
				site_name: SiteConfig.site_name,
				site_motto: SiteConfig.site_motto,
			};

			const view = templateHelper.render('themes/' + (ctx.session.theme || SiteConfig.default_theme || templateHelper.currentTheme) + '/index.tpl', myvars);
			ctx.body = view;
		} catch (error) {
			console.error("Error occurred in showMemberArea route:", error);
		}
	}

	async showTetris(ctx) {
		try {
			const content = templateHelper.render('views/tetris.html', {});
			await this.showPage(ctx, { content });
		} catch (error) {
			console.error("Error occurred in showTetris route:", error);
		}
	}

	async handleCreatePost(ctx) {
		try {
			if (!ctx.session.user) {
				ctx.redirect('/login');
				return;
			}

			const content = (ctx.request.body.content || '').trim();
			if (content) {
				await myuser.createPost(ctx.session.user.id, content);
			}

			ctx.redirect('/');
		} catch (error) {
			console.error("Error in handleCreatePost:", error);
			ctx.redirect('/');
		}
	}

	async handleDeletePost(ctx, postId) {
		try {
			if (!ctx.session.user) {
				ctx.redirect('/login');
				return;
			}

			await myuser.deletePost(postId, ctx.session.user.id);
			ctx.redirect('/');
		} catch (error) {
			console.error("Error in handleDeletePost:", error);
			ctx.redirect('/');
		}
	}

	async showRegisterSuccess(ctx, userInfo) {
		try {
			const currentTheme = ctx.session.theme || SiteConfig.default_theme || templateHelper.currentTheme;
			const myvars = {
				sidebar1: 'Welcome to the community. You have been successfully added to the database, enjoy being with us',
				content: templateHelper.render('views/registersuccess.html', userInfo),
				sidebar1_title: '',
				sidebar2_title: '',
				utility_menu: '',
				main_menu: SiteConfig.main_menu,
				banner_insert: '',
				sidebar2: '',
				themepath: '/themes/' + currentTheme,
				site_name: SiteConfig.site_name,
				site_motto: SiteConfig.site_motto,
			};

			const view = templateHelper.render('themes/' + currentTheme + '/index.tpl', myvars);
			ctx.body = view;
		} catch (error) {
			console.error("Error occurred in showRegisterSuccess route:", error);
			// Handle error
		}
	}

	async showPage(ctx, params) {
		try {
			const currentTheme = ctx.session.theme || SiteConfig.default_theme || templateHelper.currentTheme;
			const myvars = {
				sidebar1: '<ul>' + SiteConfig.main_menu + '</ul>',
				content: templateHelper.render('views/memberpage.html', params),
				sidebar1_title: '',
				sidebar2_title: '',
				utility_menu: ctx.session.user ? SiteConfig.utility_menu : '',
				main_menu: SiteConfig.main_menu,
				banner_insert: '', // Hidden on inner pages!
				sidebar2: '',
				themepath: '/themes/' + currentTheme,
				site_name: SiteConfig.site_name,
				site_motto: SiteConfig.site_motto,
			};

			const view = templateHelper.render('themes/' + currentTheme + '/index.tpl', myvars);
			ctx.body = view;
		} catch (error) {
			console.error("Error occurred in showPage route:", error);
			// Handle error
		}
	}

	async listUsers(ctx) {
		try {
			const users = await myuser.listUsers();
			let userCards = '';

			if (!users || users.length === 0) {
				userCards = '<div class="empty-members">No registered community members yet.</div>';
			} else {
				users.forEach(user => {
					const initials = getInitials(user.firstname, user.lastname, user.login);
					const safeFirst = escapeHtml(user.firstname);
					const safeLast = escapeHtml(user.lastname);
					const safeLogin = escapeHtml(user.login);
					const safeBio = user.bio ? escapeHtml(user.bio) : 'Community member';

					userCards += `
						<a href="/profile/${encodeURIComponent(user.login)}" class="member-card">
							<div class="member-top">
								<div class="member-avatar">${initials}</div>
								<div class="member-names">
									<div class="member-fullname">${safeFirst} ${safeLast}</div>
									<div class="member-username">@${safeLogin}</div>
								</div>
							</div>
							<div class="member-bio">${safeBio}</div>
							<div class="member-action">View Profile &rarr;</div>
						</a>
					`;
				});
			}

			const content = templateHelper.render('views/people.html', {
				user_cards: userCards
			});

			await this.showPage(ctx, { content });
		} catch (error) {
			console.error("Error occurred in listUsers route:", error);
		}
	}

	async showProfile(ctx, username) {
		try {
			const targetUsername = username || (ctx.session.user && ctx.session.user.login);

			if (!targetUsername) {
				ctx.redirect('/login');
				return;
			}

			const user = await myuser.findUser({ login: targetUsername });

			if (!user) {
				const content = `
					<div style="padding: 30px; text-align: center; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px;">
						<h2 style="color: #1e3a8a; margin-top: 0;">Member Not Found</h2>
						<p style="color: #64748b;">The user "@${escapeHtml(targetUsername)}" does not exist in our community directory.</p>
						<a href="/people" style="color: #2563eb; font-weight: bold; text-decoration: none;">&larr; Back to Member Directory</a>
					</div>
				`;
				await this.showPage(ctx, { content });
				return;
			}

			const isOwner = ctx.session.user && (ctx.session.user.login === user.login || ctx.session.user.id === user.id);
			const followCounts = await myuser.getFollowCounts(user.id);
			const isFollowing = !isOwner && ctx.session.user ? await myuser.isFollowing(ctx.session.user.id, user.id) : false;

			let editButton = '';
			let followButton = '';
			let messageButton = '';

			if (isOwner) {
				editButton = `<a href="/profile/${encodeURIComponent(user.login)}/edit" class="btn-edit">Edit profile</a>`;
			} else if (ctx.session.user) {
				messageButton = `<a href="/messages/${encodeURIComponent(user.login)}" class="btn-message">Message</a>`;
				if (isFollowing) {
					followButton = `
						<form method="POST" action="/profile/${encodeURIComponent(user.login)}/unfollow" style="display:inline">
							<button type="submit" class="btn-unfollow" title="Click to Unfollow">
								<span class="text-following">Following</span>
								<span class="text-unfollow">Unfollow</span>
							</button>
						</form>
					`;
				} else {
					followButton = `
						<form method="POST" action="/profile/${encodeURIComponent(user.login)}/follow" style="display:inline">
							<button type="submit" class="btn-follow">Follow</button>
						</form>
					`;
				}
			} else {
				followButton = `<a href="/login" class="btn-follow">Follow</a>`;
				messageButton = `<a href="/login" class="btn-message">Message</a>`;
			}

			const url = new URL(ctx.req.url, `http://${ctx.req.headers.host || 'localhost'}`);
			const notice = url.searchParams.get('updated') === '1'
				? '<div class="notice-box">✓ Your profile has been updated successfully!</div>'
				: '';

			const content = templateHelper.render('views/profile.html', {
				avatar_initials: getInitials(user.firstname, user.lastname, user.login),
				firstname: escapeHtml(user.firstname),
				lastname: escapeHtml(user.lastname),
				login: escapeHtml(user.login),
				email: escapeHtml(user.email),
				bio: user.bio ? escapeHtml(user.bio) : '<em>No bio provided yet.</em>',
				follow_button: followButton,
				message_button: messageButton,
				edit_button: editButton,
				following_count: followCounts.following,
				followers_count: followCounts.followers,
				notice: notice
			});

			await this.showPage(ctx, { content });
		} catch (error) {
			console.error("Error occurred in showProfile route:", error);
		}
	}

	async showEditProfile(ctx, username, errorMessage = '', formData = null) {
		try {
			if (!ctx.session.user) {
				ctx.redirect('/login');
				return;
			}

			if (ctx.session.user.login !== username) {
				ctx.redirect(`/profile/${encodeURIComponent(ctx.session.user.login)}`);
				return;
			}

			const user = await myuser.findUser({ id: ctx.session.user.id });
			if (!user) {
				ctx.redirect('/login');
				return;
			}

			const data = formData || user;
			const errorHtml = errorMessage
				? `<div class="edit-error">${escapeHtml(errorMessage)}</div>`
				: '';

			const userTheme = data.theme || user.theme || SiteConfig.default_theme || templateHelper.currentTheme;
			const content = templateHelper.render('views/profile_edit.html', {
				login: escapeHtml(user.login),
				firstname: escapeHtml(data.firstname || ''),
				lastname: escapeHtml(data.lastname || ''),
				email: escapeHtml(data.email || ''),
				bio: escapeHtml(data.bio || ''),
				error: errorHtml,
				theme_options: Object.entries(templateHelper.activeThemes).map(([k, v]) =>
					`<option value="${k}"${k === userTheme ? ' selected' : ''}>${v}</option>`
				).join('')
			});

			await this.showPage(ctx, { content });
		} catch (error) {
			console.error("Error occurred in showEditProfile route:", error);
		}
	}

	async updateProfile(ctx, username) {
		try {
			if (!ctx.session.user) {
				ctx.redirect('/login');
				return;
			}

			if (ctx.session.user.login !== username) {
				ctx.redirect(`/profile/${encodeURIComponent(ctx.session.user.login)}`);
				return;
			}

			const { firstname, lastname, email, bio, theme } = ctx.request.body;
			const cleanFirst = (firstname || '').trim();
			const cleanLast = (lastname || '').trim();
			const cleanEmail = (email || '').trim();
			const cleanBio = (bio || '').trim();
			const cleanTheme = templateHelper.activeThemes.hasOwnProperty(theme)
				? theme
				: (SiteConfig.default_theme || templateHelper.currentTheme);

			if (!cleanFirst || !cleanLast) {
				await this.showEditProfile(ctx, username, 'First name and Last name are required.', ctx.request.body);
				return;
			}

			if (!FormHelper.isEmail(cleanEmail)) {
				await this.showEditProfile(ctx, username, 'Please provide a valid email address.', ctx.request.body);
				return;
			}

			// Check if email is already taken by another member
			const existing = await myuser.findUser({ email: cleanEmail });
			if (existing && existing.id !== ctx.session.user.id) {
				await this.showEditProfile(ctx, username, 'That email address is already in use by another member.', ctx.request.body);
				return;
			}

			const updated = await myuser.updateUser(ctx.session.user.id, {
				firstname: cleanFirst,
				lastname: cleanLast,
				email: cleanEmail,
				bio: cleanBio,
				theme: cleanTheme
			});

			// Update session with fresh details
			ctx.session.user = updated;
			ctx.session.theme = cleanTheme;
			ctx.redirect(`/profile/${encodeURIComponent(username)}?updated=1`);
		} catch (error) {
			console.error("Error occurred in updateProfile route:", error);
			await this.showEditProfile(ctx, username, 'Could not save profile changes. Please try again.', ctx.request.body);
		}
	}

	// --- Follow / Social Connection Methods ---

	async followUser(ctx, targetUsername) {
		try {
			if (!ctx.session.user) {
				ctx.redirect('/login');
				return;
			}

			const targetUser = await myuser.findUser({ login: targetUsername });
			if (targetUser && targetUser.id !== ctx.session.user.id) {
				await myuser.follow(ctx.session.user.id, targetUser.id);
			}

			let returnTo = ctx.request.body && ctx.request.body.returnTo;
			if (!returnTo && ctx.req.headers.referer) {
				try {
					const refUrl = new URL(ctx.req.headers.referer);
					returnTo = refUrl.pathname + refUrl.search;
				} catch (e) {
					returnTo = null;
				}
			}
			if (!returnTo) {
				returnTo = `/profile/${encodeURIComponent(targetUsername)}`;
			}
			ctx.redirect(returnTo);
		} catch (error) {
			console.error("Error occurred in followUser route:", error);
			ctx.redirect(`/profile/${encodeURIComponent(targetUsername)}`);
		}
	}

	async unfollowUser(ctx, targetUsername) {
		try {
			if (!ctx.session.user) {
				ctx.redirect('/login');
				return;
			}

			const targetUser = await myuser.findUser({ login: targetUsername });
			if (targetUser) {
				await myuser.unfollow(ctx.session.user.id, targetUser.id);
			}

			let returnTo = ctx.request.body && ctx.request.body.returnTo;
			if (!returnTo && ctx.req.headers.referer) {
				try {
					const refUrl = new URL(ctx.req.headers.referer);
					returnTo = refUrl.pathname + refUrl.search;
				} catch (e) {
					returnTo = null;
				}
			}
			if (!returnTo) {
				returnTo = `/profile/${encodeURIComponent(targetUsername)}`;
			}
			ctx.redirect(returnTo);
		} catch (error) {
			console.error("Error occurred in unfollowUser route:", error);
			ctx.redirect(`/profile/${encodeURIComponent(targetUsername)}`);
		}
	}

	async showConnections(ctx, targetUsername, activeTab = 'following') {
		try {
			const targetLogin = targetUsername || (ctx.session.user && ctx.session.user.login);

			if (!targetLogin) {
				ctx.redirect('/login');
				return;
			}

			const user = await myuser.findUser({ login: targetLogin });
			if (!user) {
				const content = `
					<div style="padding: 30px; text-align: center; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px;">
						<h2 style="color: #1e3a8a; margin-top: 0;">Member Not Found</h2>
						<p style="color: #64748b;">The user "@${escapeHtml(targetLogin)}" does not exist in our community directory.</p>
						<a href="/people" style="color: #2563eb; font-weight: bold; text-decoration: none;">&larr; Back to Member Directory</a>
					</div>
				`;
				await this.showPage(ctx, { content });
				return;
			}

			const isOwner = ctx.session.user && (ctx.session.user.login === user.login || ctx.session.user.id === user.id);
			const currentUserId = ctx.session.user ? ctx.session.user.id : null;
			const followCounts = await myuser.getFollowCounts(user.id);
			const myFollowingSet = currentUserId ? await myuser.getFollowingIds(currentUserId) : new Set();

			const isFollowingTab = activeTab !== 'followers';
			const list = isFollowingTab ? await myuser.getFollowing(user.id) : await myuser.getFollowers(user.id);

			let connectionsHtml = '';
			if (!list || list.length === 0) {
				const emptyMsg = isFollowingTab
					? (isOwner ? 'You are not following anyone yet.<br><a href="/people" style="color:#2563eb;font-weight:bold;margin-top:8px;display:inline-block;">Browse community members &rarr;</a>' : `@${escapeHtml(user.login)} is not following anyone yet.`)
					: (isOwner ? 'No one is following you yet.' : `No one is following @${escapeHtml(user.login)} yet.`);
				connectionsHtml = `<div class="empty-connections">${emptyMsg}</div>`;
			} else {
				const currentUrl = ctx.req.url;
				list.forEach(person => {
					const initials = getInitials(person.firstname, person.lastname, person.login);
					const safeFirst = escapeHtml(person.firstname);
					const safeLast = escapeHtml(person.lastname);
					const safeLogin = escapeHtml(person.login);
					const safeBio = person.bio ? escapeHtml(person.bio) : '';
					const isSelf = currentUserId && currentUserId === person.id;
					const isFollowedByMe = myFollowingSet.has(person.id);

					let actionButtons = `<a href="/profile/${encodeURIComponent(person.login)}" class="btn-conn-view">Profile</a>`;

					if (currentUserId && !isSelf) {
						actionButtons += `<a href="/messages/${encodeURIComponent(person.login)}" class="btn-conn-msg">Message</a>`;
						if (isFollowedByMe) {
							actionButtons += `
								<form method="POST" action="/profile/${encodeURIComponent(person.login)}/unfollow" style="display:inline;margin:0;">
									<input type="hidden" name="returnTo" value="${escapeHtml(currentUrl)}">
									<button type="submit" class="btn-conn-unfollow" title="Click to Unfollow">
										<span class="text-following">Following</span>
										<span class="text-unfollow">Unfollow</span>
									</button>
								</form>
							`;
						} else {
							actionButtons += `
								<form method="POST" action="/profile/${encodeURIComponent(person.login)}/follow" style="display:inline;margin:0;">
									<input type="hidden" name="returnTo" value="${escapeHtml(currentUrl)}">
									<button type="submit" class="btn-conn-follow">Follow</button>
								</form>
							`;
						}
					} else if (!currentUserId) {
						actionButtons += `
							<a href="/login" class="btn-conn-msg">Message</a>
							<a href="/login" class="btn-conn-follow">Follow</a>
						`;
					}

					connectionsHtml += `
						<div class="connection-item">
							<a href="/profile/${encodeURIComponent(person.login)}" class="conn-user-info">
								<div class="conn-avatar">${initials}</div>
								<div class="conn-name-block">
									<div class="conn-fullname">${safeFirst} ${safeLast}</div>
									<div class="conn-username">@${safeLogin}</div>
									${safeBio ? `<div class="conn-bio-snippet">${safeBio}</div>` : ''}
								</div>
							</a>
							<div class="conn-actions">
								${actionButtons}
							</div>
						</div>
					`;
				});
			}

			const backUrl = isOwner ? '/profile' : `/profile/${encodeURIComponent(user.login)}`;
			const backText = isOwner ? 'Back to profile' : `@${escapeHtml(user.login)}`;

			const content = templateHelper.render('views/connections.html', {
				profile_login: escapeHtml(user.login),
				back_url: backUrl,
				back_text: backText,
				following_count: followCounts.following,
				followers_count: followCounts.followers,
				following_active: isFollowingTab ? 'active' : '',
				followers_active: !isFollowingTab ? 'active' : '',
				connections_list: connectionsHtml
			});

			await this.showPage(ctx, { content });
		} catch (error) {
			console.error("Error occurred in showConnections route:", error);
		}
	}

	// --- Discussion / Messaging Methods ---

	async showDiscussions(ctx, targetUsername = null) {
		try {
			if (!ctx.session.user) {
				ctx.redirect('/login');
				return;
			}

			const currentUserId = ctx.session.user.id;
			let conversations = await myuser.getConversations(currentUserId);

			// Determine which contact is actively selected
			let activeContact = null;
			if (targetUsername) {
				activeContact = await myuser.findUser({ login: targetUsername });
			}

			// If no target specified but conversations exist, default to the most recent conversation
			if (!activeContact && conversations.length > 0) {
				activeContact = await myuser.findUser({ id: conversations[0].contact_id });
			}

			// Prevent chatting with yourself
			if (activeContact && activeContact.id === currentUserId) {
				activeContact = null;
			}

			// If chatting with someone who isn't yet in the conversations list, prepend them
			let convList = [...conversations];
			if (activeContact && !convList.some(c => c.contact_id === activeContact.id)) {
				convList.unshift({
					contact_id: activeContact.id,
					contact_login: activeContact.login,
					contact_firstname: activeContact.firstname,
					contact_lastname: activeContact.lastname,
					last_message: 'Start a new conversation...',
					last_message_time: new Date().toISOString(),
					last_sender_id: null,
					unread_count: 0
				});
			}

			// 1. Build Left Column: Conversation Items
			let convItemsHtml = '';
			if (convList.length === 0) {
				convItemsHtml = '<div class="no-conv-box">No conversations yet.<br><a href="/people" style="color:#2563eb;font-weight:bold;margin-top:6px;display:inline-block;">Start a chat</a></div>';
			} else {
				convList.forEach(conv => {
					const isActive = activeContact && activeContact.id === conv.contact_id;
					const initials = getInitials(conv.contact_firstname, conv.contact_lastname, conv.contact_login);
					const hasUnread = conv.unread_count > 0;
					const unreadBadge = hasUnread ? `<span class="conv-unread-badge">${conv.unread_count}</span>` : '';
					const timeStr = conv.last_message_time
						? new Date(conv.last_message_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
						: '';

					convItemsHtml += `
						<a href="/messages/${encodeURIComponent(conv.contact_login)}" class="chat-conv-item ${isActive ? 'active' : ''} ${hasUnread ? 'unread' : ''}">
							<div class="conv-avatar">${initials}</div>
							<div class="conv-details">
								<div class="conv-name">${escapeHtml(conv.contact_firstname)} ${escapeHtml(conv.contact_lastname)}</div>
								<div class="conv-snippet">${escapeHtml(conv.last_message || '')}</div>
								<div class="conv-meta">
									<span class="conv-time">${timeStr}</span>
									${unreadBadge}
								</div>
							</div>
						</a>
					`;
				});
			}

			// 2. Build Right Column: Active Chat Stream & Input Form
			let activeChatHtml = '';
			if (activeContact) {
				const thread = await myuser.getThread(currentUserId, activeContact.id);
				const contactInitials = getInitials(activeContact.firstname, activeContact.lastname, activeContact.login);

				let bubblesHtml = '';
				if (thread.length === 0) {
					bubblesHtml = `<div class="empty-thread">No messages yet. Say hello to ${escapeHtml(activeContact.firstname)}! 👋</div>`;
				} else {
					thread.forEach(msg => {
						const isOutgoing = msg.sender_id === currentUserId;
						const timeStr = new Date(msg.created_at).toLocaleTimeString(undefined, {
							hour: '2-digit',
							minute: '2-digit'
						});

						bubblesHtml += `
							<div class="chat-bubble-row ${isOutgoing ? 'outgoing' : 'incoming'}">
								<div class="chat-bubble">${escapeHtml(msg.body)}</div>
								<div class="chat-bubble-time">${timeStr}</div>
							</div>
						`;
					});
				}

				activeChatHtml = `
					<div class="chat-main-header">
						<div class="chat-header-user">
							<div class="chat-header-avatar">${contactInitials}</div>
							<div class="chat-header-info">
								<h4>${escapeHtml(activeContact.firstname)} ${escapeHtml(activeContact.lastname)}</h4>
								<a href="/profile/${encodeURIComponent(activeContact.login)}">@${escapeHtml(activeContact.login)} &bull; View Profile</a>
							</div>
						</div>
					</div>

					<div class="chat-stream" id="chat-stream">
						${bubblesHtml}
					</div>

					<div class="chat-footer">
						<form method="POST" action="/messages/${encodeURIComponent(activeContact.login)}" class="chat-input-form">
							<input type="text" id="chat-input" name="body" class="chat-input-box" placeholder="Type a message to ${escapeHtml(activeContact.firstname)}..." autocomplete="off" required />
							<button type="submit" class="btn-chat-send">Send ✈</button>
						</form>
					</div>
				`;
			} else {
				activeChatHtml = `
					<div class="chat-empty-state">
						<div class="chat-empty-icon">💬</div>
						<h3>Your Discussions</h3>
						<p>Select a discussion on the left, or message a member from the directory.</p>
						<a href="/people" class="btn-browse-people">Browse Community Members</a>
					</div>
				`;
			}

			const content = templateHelper.render('views/discussions.html', {
				conversation_items: convItemsHtml,
				active_chat_content: activeChatHtml
			});

			await this.showPage(ctx, { content });
		} catch (error) {
			console.error("Error occurred in showDiscussions route:", error);
		}
	}

	async handleSendChatMessage(ctx, targetUsername) {
		try {
			if (!ctx.session.user) {
				ctx.redirect('/login');
				return;
			}

			const bodyText = (ctx.request.body.body || '').trim();
			if (!bodyText) {
				ctx.redirect(`/messages/${encodeURIComponent(targetUsername)}`);
				return;
			}

			const recipient = await myuser.findUser({ login: targetUsername });
			if (!recipient || recipient.id === ctx.session.user.id) {
				ctx.redirect('/messages');
				return;
			}

			await myuser.sendMessage({
				sender_id: ctx.session.user.id,
				recipient_id: recipient.id,
				body: bodyText
			});

			ctx.redirect(`/messages/${encodeURIComponent(targetUsername)}`);
		} catch (error) {
			console.error("Error occurred in handleSendChatMessage route:", error);
			ctx.redirect('/messages');
		}
	}

	async loginUser(ctx) {
		console.log("Hello from login");
		const { usrLogin, usrPassword } = ctx.request.body;

		// Check if usrLogin is an email or username
		if (FormHelper.isEmail(usrLogin) || FormHelper.isUsername(usrLogin)) {
			try {
				// Proceed with login logic
				const user = await myuser.findUser(FormHelper.isEmail(usrLogin) ? { email: usrLogin } : { login: usrLogin });
				const isPasswordMatch = user && (user.password === usrPassword || bcrypt.compareSync(usrPassword, user.password));

				if (isPasswordMatch) {
					// Set session user and redirect to home page
					ctx.session.user = user;
					ctx.session.theme = user.theme || SiteConfig.default_theme || templateHelper.currentTheme;
					ctx.redirect('/');
				} else {
					// User not found, show login page
					await this.showLogin(ctx);
				}
			} catch (error) {
				console.error("Error occurred during login:", error);
				ctx.status = 500;
				ctx.body = "Internal Server Error";
			}
		} else {
			// Invalid usrLogin format, show login page
			await this.showLogin(ctx);
		}
	}

	async logoffUser(ctx) {
		try {
			console.log('Logging out');
			ctx.session.user = null;
			await this.showLogin(ctx);
		} catch (error) {
			console.error("Error occurred in logoffUser route:", error);
			// Handle error
		}
	}

	async registerUser(ctx) {
		const userInfo = {};

		const userFields = {
			'firstname': 'name',
			'lastname': 'name',
			'email': 'email',
			'login': 'username',
			'password': 'password'
		};

		for (const field in userFields) {
			const fieldType = userFields[field];
			const fieldValue = (ctx.request.body[field] || '').trim();
			console.log(field + " " + fieldType + " " + fieldValue);
			switch (fieldType) {
				case 'name':
				case 'password':
				case 'string':
					userInfo[field] = fieldValue;
					break;
				case 'username':
					if (FormHelper.isUsername(fieldValue)) {
						userInfo[field] = fieldValue;
					}
					break;
				case 'email':
					if (FormHelper.isEmail(fieldValue)) {
						userInfo[field] = fieldValue;
					}
					break;
			}
		}

		let errorMsg = '';
		if (!ctx.request.body.firstname || !ctx.request.body.lastname) {
			errorMsg = 'First name and Last name are required.';
		} else if (!userInfo.login) {
			errorMsg = 'Invalid username. It must start with a letter and contain only letters, numbers, or underscores.';
		} else if (!userInfo.email) {
			errorMsg = 'Invalid email address.';
		} else if (!ctx.request.body.password || ctx.request.body.password.length < 6) {
			errorMsg = 'Password must be at least 6 characters long.';
		}

		if (errorMsg) {
			console.log("Validation error:", errorMsg);
			await this.showForm(ctx, ctx.request.body, errorMsg);
			return;
		}

		const confirmationCode = FormHelper.getRandomString();
		userInfo['confirm'] = confirmationCode;

		console.log("adding user");
		const hashed = bcrypt.hashSync(ctx.request.body.password, 10);
		await myuser.addUser({
			login: userInfo['login'],
			email: userInfo['email'],
			firstname: userInfo['firstname'],
			lastname: userInfo['lastname'],
			password: hashed,
			confirm: userInfo['confirm']
		},
			async () => {
				await this.showRegisterSuccess(ctx, ctx.request.body);
				console.log("success in add");
			},
			async (err) => {
				const isDuplicate = err && err.message && err.message.includes('UNIQUE');
				const failMsg = isDuplicate
					? 'A user with that username or email already exists.'
					: 'Could not register user. Please try again.';
				await this.showForm(ctx, ctx.request.body, failMsg);
			}
		);
	}

	async registerForm(ctx) {
		try {
			const userInfo = {};
			await this.showForm(ctx, userInfo);
		} catch (error) {
			console.error("Error occurred in registerForm route:", error);
			// Handle error
		}
	}

	async setTheme(ctx) {
		if (templateHelper.activeThemes.hasOwnProperty(ctx.params.theme)) {
			ctx.session.theme = ctx.params.theme;
		}
		await this.index(ctx);
	}

	async themes(ctx) {
		console.log("hello from theme");
		console.log(ctx.params);	
		const extensions = {
			'txt': 'text/plain',
			'swf': 'application/x-shockwave-flash',
			'jpg': 'image/jpeg',
			'gif': 'image/gif',
			'png': 'image/png',
			'jpeg': 'image/jpeg',
			'css': 'text/css',
			'js': 'text/javascript'
		};

		let myTheme;
		if (templateHelper.activeThemes.hasOwnProperty(ctx.params.theme)) {
			myTheme = ctx.params.theme;
		} else {
			ctx.body = '<h1>File not available</h1>Something went wrong';
			return;
		}

		const filename = ctx.params.file;
		const fileExtension = filename.split('.').pop();
		console.log(fileExtension + " " + filename + "\n");
		const mimeType = extensions[fileExtension];
		const __dirname = path.dirname(new URL(import.meta.url).pathname);

		if (mimeType) {
			console.log(`${__dirname}/themes/${myTheme}/${filename}`);
			try {
				const fileData = await fs.promises.readFile(path.join(__dirname, 'themes', myTheme, filename));
				ctx.type = mimeType;
				ctx.body = fileData;
			} catch (err) {
				console.error("Error reading file:", err);
				ctx.status = 404;
				ctx.body = `<h1>File not available</h1>Something went wrong<br>\nTried to get : themes/${myTheme}/${filename}`;
			}

			// fs.readFile(`${__dirname}/themes/${myTheme}/${filename}`, "binary", function (err, file) {
			// 	if (err) {
			// 		console.log("file found")
			// 		ctx.status = 404;
			// 		ctx.body = `<h1>File not available</h1>Something went wrong<br>\nTried to get : themes/${myTheme}/${filename}`;
			// 		return;
			// 	} else {
			// 		console.log("file not found");
			// 	}
			// 	ctx.type = mimeType;
			// 	ctx.body = file;
			// });
		}
	}
}

export default Routes;
