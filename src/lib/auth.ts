import { APP_SECRET, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } from '$env/static/private';
import { SvelteKitAuth } from '@auth/sveltekit';
import Discord from '@auth/sveltekit/providers/discord';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Discord({
			clientId: DISCORD_CLIENT_ID,
			clientSecret: DISCORD_CLIENT_SECRET,
			authorization: 'https://discord.com/api/oauth2/authorize?scope=identify'
		})
	],
	secret: APP_SECRET,
	trustHost: true,
	callbacks: {
		async jwt({ token, account, profile }) {
			if (profile) {
				token.id = profile.id;
				token.username = profile.username;
			}
			return token;
		},
		async session({ session, token, user }): Promise<{
			discord_id: string;
			username: string;
			display_name: string;
			avatar_url: string;
		}> {
			return {
				discord_id: token.id as string,
				username: token.username as string,
				display_name: session.user.name as string,
				avatar_url: session.user.image as string
			};
		}
	}
});
