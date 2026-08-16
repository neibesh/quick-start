import { HomeTiles } from "./components/home-tiles";

export default function Home() {
	return (
		<div className="flex flex-1 flex-col bg-[var(--background)]">
			<main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-16 sm:px-8">
				<h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
					Get started
				</h1>
				<p className="mt-3 max-w-xl text-lg leading-7 text-zinc-600 dark:text-zinc-400">
					Search, open VolunteerHub or eAcademy, or scan a QR code to visit a site.
				</p>
				<HomeTiles />
			</main>
		</div>
	);
}
