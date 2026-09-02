"use client"
import { SignedIn, SignedOut, SignInButton, UserButton, Show, SignUpButton } from "@clerk/nextjs";
import React from "react"
import { Button } from "./ui/button"
import Image from "next/image";
import Link from "next/link";

const Header = () => {
    return (
        <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-3 sm:px-10 py-3 border-b border-white/7 backdrop-blur-xl">
            <Link href="/">
                <Image
                    src="/logo.png"
                    alt="Prept Logo"
                    width={100}
                    height={100}
                    className="h-11 w-auto"
                />
            </Link>


            {/* Sign in */}
            <div className="flex items-center gap-3">
                <Show when="signed-out">
                    {/* Link */}
                    {/* Credit */}
                    <SignInButton mode="modal">
                        <Button variant="ghost">Sign Up</Button>
                    </SignInButton>
                    <SignInButton>
                        <Button variant="gold">Get started →</Button>
                    </SignInButton>
                </Show>
                <Show when="signed-in">
                    <UserButton />
                </Show>
            </div>
        </nav>
    )
}
export default Header