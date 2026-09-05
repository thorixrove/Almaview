import { getInterviewers } from "@/actions/explore";
import PageHeader from "@/components/reusables";
import ExploreGrid from "./components/ExploreGrid";

export default  async function ExplorePagee() {
    const interviewers = await getInterviewers()

    return (
        <main>
            {/* Page header */}
            <PageHeader
                label="Explore"
                gray="Find your"
                gold="expert interviewer"
                description="Browse senior engineers from top companies."
            />

            {/* Content */}
            <div className="max-w-6xl mx-auto px-8 xl:px-0 py-10">
                <ExploreGrid Interviewers={interviewers} />
            </div>
        </main>
    )
}
