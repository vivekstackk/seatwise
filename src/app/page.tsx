import ParticleText from "./components/ParticleText";
import EventUniverse from "./components/EventUniverse";
import SiteMenu from "./components/SiteMenu";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#11110f] text-[#f1efe8]">

      {/* =====================================================
          SECTION 01 — HERO
      ===================================================== */}

      <section
        id="top"
        className="relative min-h-screen overflow-hidden px-5 py-5 md:px-8 md:py-7"
      >

        {/* ================= NAVBAR ================= */}

        <nav className="relative z-50 flex items-start justify-between">

          {/* LOGO */}

          <a href="#" className="group">
            <div className="text-[24px] font-black leading-none tracking-[-0.07em] md:text-[30px]">
              SEATWISE
              <sup className="ml-1 text-[8px] font-medium">®</sup>
            </div>

            <div className="mt-1 text-[8px] uppercase tracking-[0.2em] text-white/45">
              Live event ticketing
            </div>
          </a>

          {/* NAV RIGHT */}

          <div className="flex items-center gap-6">

            <span className="hidden text-[9px] uppercase tracking-[0.18em] text-white/45 md:block">
              IND / 2026
            </span>

            <SiteMenu />

          </div>

        </nav>


        {/* =====================================================
            HERO
        ===================================================== */}

        <div
          className="
            relative
            mx-auto
            mt-10
            h-[78vh]
            max-w-[1500px]
            md:mt-4
            md:h-[78vh]
          "
        >

          {/* ================= LEFT META ================= */}

          <div className="absolute left-0 top-[7%] z-30 hidden md:block">

            <p className="text-[9px] uppercase leading-[1.5] tracking-[0.18em] text-white/45">
              LIVE EVENTS
              <br />
              EXACT SEATING
              <br />
              REAL TIME
            </p>

          </div>


          {/* ================= RIGHT META ================= */}

          <div className="absolute right-0 top-[7%] z-30 text-right">

            <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">
              Discover / Book / Be there
            </span>

          </div>


          {/* =====================================================
              MASKED HERO VIDEO
          ===================================================== */}

          <div
            className="
              hero-mask
              absolute
              left-1/2
              top-1/2
              z-10
              h-[58%]
              w-[92%]
              -translate-x-1/2
              -translate-y-1/2
              overflow-hidden
              md:h-[68%]
              md:w-[67%]
            "
          >

            <video
              className="
                hero-image
                absolute
                inset-[-3%]
                h-[106%]
                w-[106%]
                object-cover
              "
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/hero-bg.png"
            >

              <source
                src="/events/hero-bg.mp4"
                type="video/mp4"
              />

            </video>

            {/* CINEMATIC DARK OVERLAY */}

            <div className="absolute inset-0 bg-black/10" />

          </div>


          {/* =====================================================
              CLAIM
          ===================================================== */}

          <h1
            className="
              hero-word
              hero-word-one
              pointer-events-none
              absolute
              left-[2%]
              top-[12%]
              z-20
              text-[17vw]
              font-black
              uppercase
              leading-[0.75]
              tracking-[-0.09em]
              md:left-[8%]
              md:top-[12%]
              md:text-[10vw]
            "
          >
            CLAIM
          </h1>


          {/* =====================================================
              YOUR
          ===================================================== */}

          <div
            className="
              hero-word
              hero-word-two
              pointer-events-none
              absolute
              right-[3%]
              top-[40%]
              z-30
              text-[15vw]
              font-black
              uppercase
              leading-[0.75]
              tracking-[-0.09em]
              md:right-[5%]
              md:top-[40%]
              md:text-[9vw]
            "
          >
            YOUR
          </div>


          {/* =====================================================
              PARTICLE PLACE
          ===================================================== */}

          <div
            className="
              hero-word
              hero-word-three
              absolute
              bottom-[16%]
              left-[16%]
              z-30
              h-[145px]
              w-[76%]
              md:bottom-[-4%]
              md:left-[20%]
              md:h-[220px]
              md:w-[64%]
            "
          >

            <ParticleText
              text="PLACE."
              particleSize={1.8}
              density={4}
              color="#f1efe8"
              highlightColor="#d8763d"
              scatter={115}
              gatherDuration={850}
              stagger={160}
              pointerRepel={60}
              repelRadius={130}
              idleDrift={0.25}
              trigger="hover"
              fontSize="clamp(5rem, 10vw, 10rem)"
              fontWeight={900}
              fontFamily="Arial, Helvetica, sans-serif"
              glow={false}
              style={{
                width: "100%",
                height: "100%",
              }}
            />

          </div>


          {/* =====================================================
              BOTTOM LEFT
          ===================================================== */}

          <div className="absolute bottom-0 left-0 z-40 hidden max-w-[220px] md:block">

            <p className="text-[11px] leading-[1.45] text-white/55">
              Find the event.
              <br />
              Choose the exact seat.
              <br />
              Make it yours.
            </p>

          </div>


          {/* =====================================================
              CTA
          ===================================================== */}

          <a
            href="#event-universe"
            className="
              group
              absolute
              bottom-[2%]
              right-0
              z-40
              flex
              h-[72px]
              w-[190px]
              items-center
              justify-between
              bg-[#f1efe8]
              px-5
              text-black
              transition-all
              duration-300
              hover:bg-[#d8763d]
              md:bottom-0
              md:h-[82px]
              md:w-[230px]
              md:px-6
            "
          >

            <div>

              <span className="block text-[9px] uppercase tracking-[0.18em] text-black/45">
                01 / Explore
              </span>

              <span className="mt-1 block text-[14px] font-bold uppercase tracking-[-0.02em]">
                Find Events
              </span>

            </div>

            <span className="text-xl transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
              ↗
            </span>

          </a>


          {/* ================= SCROLL ================= */}

          <div className="absolute bottom-0 left-1/2 z-30 hidden -translate-x-1/2 md:block">

            <span className="text-[8px] uppercase tracking-[0.25em] text-white/35">
              Scroll to discover ↓
            </span>

          </div>

        </div>

      </section>


      {/* =====================================================
          SECTION 02 — EVENT UNIVERSE
      ===================================================== */}

      <section id="event-universe">
        <EventUniverse />
      </section>


      {/* =====================================================
          SECTION 03 — UPCOMING EVENTS
      ===================================================== */}

      <section
        id="events"
        className="relative overflow-hidden bg-[#ebe8df] px-5 py-20 text-[#11110f] md:px-8 md:py-28"
      >

        <div className="mx-auto max-w-[1600px]">

          {/* ================= HEADER ================= */}

          <div className="flex items-start justify-between border-t border-black/40 pt-3">

            <div className="text-[10px] font-semibold uppercase tracking-[0.18em]">
              03 / Upcoming Events
            </div>

            <div className="text-right text-[9px] uppercase leading-[1.5] tracking-[0.18em] text-black/50">
              India
              <br />
              All Cities
            </div>

          </div>


          {/* =====================================================
              BIG HEADING
          ===================================================== */}

          <div className="relative mt-16 md:mt-24">

            <h2 className="text-[19vw] font-black uppercase leading-[0.72] tracking-[-0.09em] md:text-[11vw]">
              Happening
            </h2>

            <div className="mt-4 flex items-end justify-between md:mt-7">

              <p className="hidden max-w-[250px] text-[11px] leading-[1.5] text-black/55 md:block">
                Music, comedy, theatre and live experiences.
                Pick the event. Then pick exactly where you sit.
              </p>

              <h2 className="ml-auto text-[19vw] font-black uppercase leading-[0.72] tracking-[-0.09em] md:text-[11vw]">
                Next<span className="text-[#d8763d]">.</span>
              </h2>

            </div>

          </div>


          {/* =====================================================
              EVENT 01
          ===================================================== */}

          <a
            href="#"
            className="group mt-24 grid border-t border-black/40 py-6 md:grid-cols-12 md:gap-6"
          >

            <div className="mb-4 md:col-span-1 md:mb-0">
              <span className="text-[11px] font-semibold">
                01
              </span>
            </div>


            <div className="overflow-hidden md:col-span-5">

              <div
                className="
                  aspect-[16/10]
                  bg-cover
                  bg-center
                  transition-transform
                  duration-700
                  ease-out
                  group-hover:scale-[1.025]
                "
                style={{
                  backgroundImage: "url('/events/img-1.png')",
                }}
              />

            </div>


            <div className="mt-5 flex flex-col justify-between md:col-span-6 md:mt-0">

              <div className="flex items-start justify-between">

                <span className="text-[9px] uppercase tracking-[0.18em] text-black/50">
                  Live Music
                </span>

                <span className="text-xl transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                  ↗
                </span>

              </div>


              <div className="mt-14 md:mt-0">

                <h3 className="max-w-[650px] text-[10vw] font-black uppercase leading-[0.78] tracking-[-0.07em] md:text-[5vw]">
                  The Midnight
                  <br />
                  Room
                </h3>


                <div className="mt-6 flex items-end justify-between border-t border-black/20 pt-3">

                  <div className="text-[10px] uppercase leading-[1.5] tracking-[0.12em]">
                    18 AUG / 08:00 PM
                    <br />
                    New Delhi
                  </div>

                  <div className="text-right">

                    <span className="text-[8px] uppercase tracking-[0.15em] text-black/45">
                      From
                    </span>

                    <div className="text-xl font-bold tracking-[-0.04em]">
                      ₹1,299
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </a>


          {/* =====================================================
              EVENT 02
          ===================================================== */}

          <a
            href="#"
            className="group grid border-t border-black/40 py-6 md:grid-cols-12 md:gap-6"
          >

            <div className="mb-4 md:col-span-1 md:mb-0">

              <span className="text-[11px] font-semibold">
                02
              </span>

            </div>


            <div className="order-2 mt-5 flex flex-col justify-between md:order-none md:col-span-5 md:mt-0">

              <div>

                <span className="text-[9px] uppercase tracking-[0.18em] text-black/50">
                  Stand-up
                </span>

              </div>


              <div className="mt-14 md:mt-0">

                <h3 className="text-[10vw] font-black uppercase leading-[0.78] tracking-[-0.07em] md:text-[5vw]">
                  After
                  <br />
                  Hours
                </h3>


                <div className="mt-6 flex items-end justify-between border-t border-black/20 pt-3">

                  <div className="text-[10px] uppercase leading-[1.5] tracking-[0.12em]">
                    22 AUG / 07:30 PM
                    <br />
                    Mumbai
                  </div>

                  <div className="text-right">

                    <span className="text-[8px] uppercase tracking-[0.15em] text-black/45">
                      From
                    </span>

                    <div className="text-xl font-bold tracking-[-0.04em]">
                      ₹799
                    </div>

                  </div>

                </div>

              </div>

            </div>


            <div className="order-1 overflow-hidden md:order-none md:col-span-6">

              <div
                className="
                  aspect-[16/10]
                  bg-cover
                  bg-center
                  transition-transform
                  duration-700
                  ease-out
                  group-hover:scale-[1.025]
                "
                style={{
                  backgroundImage: "url('/events/img-5.png')",
                }}
              />

            </div>

          </a>


          {/* =====================================================
              EVENT 03
          ===================================================== */}

          <a
            href="#"
            className="group grid border-t border-black/40 py-6 md:grid-cols-12 md:gap-6"
          >

            <div className="mb-4 md:col-span-1 md:mb-0">

              <span className="text-[11px] font-semibold">
                03
              </span>

            </div>


            <div className="overflow-hidden md:col-span-5">

              <div
                className="
                  aspect-[16/10]
                  bg-cover
                  bg-center
                  transition-transform
                  duration-700
                  ease-out
                  group-hover:scale-[1.025]
                "
                style={{
                  backgroundImage: "url('/events/img-9.png')",
                }}
              />

            </div>


            <div className="mt-5 flex flex-col justify-between md:col-span-6 md:mt-0">

              <div className="flex items-start justify-between">

                <span className="text-[9px] uppercase tracking-[0.18em] text-black/50">
                  Theatre
                </span>

                <span className="text-xl transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                  ↗
                </span>

              </div>


              <div className="mt-14 md:mt-0">

                <h3 className="text-[10vw] font-black uppercase leading-[0.78] tracking-[-0.07em] md:text-[5vw]">
                  Nocturne
                  <br />
                  No. 7
                </h3>


                <div className="mt-6 flex items-end justify-between border-t border-black/20 pt-3">

                  <div className="text-[10px] uppercase leading-[1.5] tracking-[0.12em]">
                    28 AUG / 06:30 PM
                    <br />
                    Bengaluru
                  </div>

                  <div className="text-right">

                    <span className="text-[8px] uppercase tracking-[0.15em] text-black/45">
                      From
                    </span>

                    <div className="text-xl font-bold tracking-[-0.04em]">
                      ₹999
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </a>


          {/* =====================================================
              VIEW ALL
          ===================================================== */}

          <div className="flex items-center justify-between border-t border-black/40 pt-5">

            <span className="text-[9px] uppercase tracking-[0.18em] text-black/45">
              SeatWise / Events / 2026
            </span>

            <a
              href="#"
              className="group flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.05em]"
            >

              View all events

              <span className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                ↗
              </span>

            </a>

          </div>

        </div>

      </section>

    </main>
  );
}