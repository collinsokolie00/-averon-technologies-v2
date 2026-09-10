import type { ReactNode } from "react";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import EmmyAssistant from "../components/assistant/EmmyAssistant";

interface MainLayoutProps {
    children: ReactNode;
}

export default function MainLayout({
    children,
}: MainLayoutProps) {
    return (
        <div className="app-shell">

            <Header />

            <main>

                {children}

            </main>

            <Footer />

            <EmmyAssistant />

        </div>
    );
}
