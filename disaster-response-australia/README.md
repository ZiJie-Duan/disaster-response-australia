Repository
This project’s government-side platform is designed to provide rapid disaster response information and data visualization. The frontend focuses on two main roles: commanders and responders. Commanders can interactively define and mark regional privacy waivers, responders can retrieve detailed information about specific areas—for example, viewing panels with data on regions and population counts, as well as accessing map-based visualizations of facilities and routing within selected areas.
To implement these features, the frontend is built on Next.js and React, chosen for their flexibility in rendering dynamic content. TypeScript and Tailwind CSS are used for component development, interaction logic, and styling. For authentication, Firebase is integrated to handle user login and verification via backend services. For mapping, the Google Maps API is embedded into the workspace to support advanced drawing and visualization functions. These drawing features are enabled through the Terra-Draw open-source library, connected via an adapter to integrate seamlessly with Google Maps.
  Installation & Setup
    To set up and run the project, first install dependencies by navigating to the root directory and running pnpm install, as pnpm is used as the package manager for faster and more efficient builds. Next, create a .env.local file in the root directory and add your Google Maps API key by setting NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here. Once the environment is configured, start the development server with pnpm dev and follow the terminal output to open the application at the indicated local address.


Branching / Commit Conventions
We follow the GitHub Flow workflow for version control, where the main branch is always kept in a deployable state and direct pushes are prohibited, with all development work carried out in dedicated branches. 
Branch names are structured by purpose: 
    new features use feature/<feature-name>, 
    bug fixes use fix/<issue-description>, 
    build or dependency updates use chore/, 
    and changes to documentation or tests use docs/ and test/ respectively. 

All commits follow the Conventional Commits specification in the format <type>(<scope>): <subject>, for example feat(auth): add email login support or fix(map): resolve marker clustering bug, ensuring a consistent and traceable history. Pull Requests must address a single feature or issue, with titles aligned to the commit convention and descriptions that explain the purpose, key changes, and evidence of testing. Before merging, every PR is required to pass linting, type checking, and unit tests, and must be approved by at least one teammate reviewer, thereby maintaining both discipline and quality throughout the development process.




This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
