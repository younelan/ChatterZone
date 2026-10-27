
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

class Routes {
	constructor() {
		// Initialize any necessary properties or instances here
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
			const myvars = {
				sidebar1: templateHelper.render('views/loginform.html', {}),
				content: templateHelper.render('views/welcome.html', {}),
				sidebar1_title: '',
				sidebar2_title: '',
				sidebar2: (() => {
					let sidebar2 = 'Feel free to change the theme too:<br />';
					for (const currentTheme in templateHelper.activeThemes) {
						sidebar2 += `<a href=/settheme/${currentTheme}>${templateHelper.activeThemes[currentTheme]}</a><br>`;
					}
					return sidebar2;
				})(),
				themepath: '/themes/' + (ctx.session.theme || templateHelper.currentTheme),
				site_name: SiteConfig.site_name,
				site_motto: SiteConfig.site_motto,
			};

			const view = templateHelper.render('themes/' + (ctx.session.theme || templateHelper.currentTheme) + '/index.tpl', myvars);
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
			const myvars = {
				sidebar1: 'Join the community. Fill in the form and participate.',
				content: templateHelper.render('views/registerform.html', userInfo),
				sidebar1_title: '',
				sidebar2_title: '',
				sidebar2: (() => {
					let sidebar2 = '';
					for (const currentTheme in templateHelper.activeThemes) {
						sidebar2 += `<a href=/settheme/${currentTheme}>${templateHelper.activeThemes[currentTheme]}</a><br>`;
					}
					return sidebar2;
				})(),
				themepath: '/themes/' + (ctx.session.theme || templateHelper.currentTheme),
				site_name: SiteConfig.site_name,
				site_motto: SiteConfig.site_motto,
			};

			const view = templateHelper.render('themes/' + (ctx.session.theme || templateHelper.currentTheme) + '/index.tpl', myvars);
			ctx.body = view;
		} catch (error) {
			console.error("Error occurred in showForm route:", error);
			// Handle error
		}
	}

	async showMemberArea(ctx) {
		try {
			const myvars = {
				sidebar1: '<ul>' + SiteConfig.main_menu + '</ul>',
				content: templateHelper.render('views/tetris.html', {}),
				sidebar1_title: '',
				sidebar2_title: '',
				utility_menu: SiteConfig.utility_menu,
				main_menu: SiteConfig.main_menu,
				sidebar2: (() => {
					let sidebar2 = '';
					for (const currentTheme in templateHelper.activeThemes) {
						sidebar2 += `<a href=/settheme/${currentTheme}>${templateHelper.activeThemes[currentTheme]}</a><br>`;
					}
					return sidebar2;
				})(),
				themepath: '/themes/' + (ctx.session.theme || templateHelper.currentTheme),
				site_name: SiteConfig.site_name,
				site_motto: SiteConfig.site_motto,
			};

			const view = templateHelper.render('themes/' + (ctx.session.theme || templateHelper.currentTheme) + '/index.tpl', myvars);
			ctx.body = view;
		} catch (error) {
			console.error("Error occurred in showMemberArea route:", error);
			// Handle error
		}
	}

	async showRegisterSuccess(ctx, userInfo) {
		try {
			const myvars = {
				sidebar1: 'Welcome to the community. You have been successfully added to the database, enjoy being with us',
				content: templateHelper.render('views/registersuccess.html', userInfo),
				sidebar1_title: '',
				sidebar2_title: '',
				sidebar2: (() => {
					let sidebar2 = '';
					for (const currentTheme in templateHelper.activeThemes) {
						sidebar2 += `<a href=/settheme/${currentTheme}>${templateHelper.activeThemes[currentTheme]}</a><br>`;
					}
					return sidebar2;
				})(),
				themepath: '/themes/' + (ctx.session.theme || templateHelper.currentTheme),
				site_name: SiteConfig.site_name,
				site_motto: SiteConfig.site_motto,
			};

			const view = templateHelper.render('themes/' + (ctx.session.theme || templateHelper.currentTheme) + '/index.tpl', myvars);
			ctx.body = view;
		} catch (error) {
			console.error("Error occurred in showRegisterSuccess route:", error);
			// Handle error
		}
	}

	async showPage(ctx, params) {
		try {
			const myvars = {
				sidebar1: '<ul>' + SiteConfig.main_menu + '</ul>',
				content: templateHelper.render('views/memberpage.html', params),
				sidebar1_title: '',
				sidebar2_title: '',
				utility_menu: SiteConfig.utility_menu,
				main_menu: SiteConfig.main_menu,
				sidebar2: (() => {
					let sidebar2 = '';
					for (const currentTheme in templateHelper.activeThemes) {
						sidebar2 += `<a href=/settheme/${currentTheme}>${templateHelper.activeThemes[currentTheme]}</a><br>`;
					}
					return sidebar2;
				})(),
				themepath: '/themes/' + (ctx.session.theme || templateHelper.currentTheme),
				site_name: SiteConfig.site_name,
				site_motto: SiteConfig.site_motto,
			};

			const view = templateHelper.render('themes/' + (ctx.session.theme || templateHelper.currentTheme) + '/index.tpl', myvars);
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
			const editButton = isOwner
				? `<a href="/profile/${encodeURIComponent(user.login)}/edit" class="btn-edit">✏️ Edit My Profile</a>`
				: '';

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
				edit_button: editButton,
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

			const content = templateHelper.render('views/profile_edit.html', {
				login: escapeHtml(user.login),
				firstname: escapeHtml(data.firstname || ''),
				lastname: escapeHtml(data.lastname || ''),
				email: escapeHtml(data.email || ''),
				bio: escapeHtml(data.bio || ''),
				error: errorHtml
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

			const { firstname, lastname, email, bio } = ctx.request.body;
			const cleanFirst = (firstname || '').trim();
			const cleanLast = (lastname || '').trim();
			const cleanEmail = (email || '').trim();
			const cleanBio = (bio || '').trim();

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
				bio: cleanBio
			});

			// Update session with fresh details
			ctx.session.user = updated;
			ctx.redirect(`/profile/${encodeURIComponent(username)}?updated=1`);
		} catch (error) {
			console.error("Error occurred in updateProfile route:", error);
			await this.showEditProfile(ctx, username, 'Could not save profile changes. Please try again.', ctx.request.body);
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
