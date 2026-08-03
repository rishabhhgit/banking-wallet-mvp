import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import * as userRepository from '../repositories/user.repository'
import { generateToken, generateRefreshToken } from '../utils/auth'
import crypto from 'crypto'

export const configureGoogleAuth = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('[AUTH] Google OAuth not configured (missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)')
    return
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL || 'http://localhost:8000'}/api/v1/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) {
            return done(new Error('No email found from Google'), undefined)
          }

          let user = await userRepository.findUserByEmail(email)

          if (!user) {
            const newUser = await userRepository.createUser({
              email,
              firstName: profile.name?.givenName || 'Google',
              lastName: profile.name?.familyName || 'User',
              password: crypto.randomBytes(32).toString('hex'),
            })
            const userId = newUser.id
            return done(null, {
              userId,
              token: generateToken({ userId }),
              refreshToken: generateRefreshToken({ userId }),
            })
          }

          const userId = user.id
          return done(null, {
            userId,
            token: generateToken({ userId }),
            refreshToken: generateRefreshToken({ userId }),
          })
        } catch (error) {
          return done(error as Error, undefined)
        }
      }
    )
  )

  passport.serializeUser((user: any, done) => {
    done(null, user)
  })

  passport.deserializeUser((user: any, done) => {
    done(null, user)
  })
}
