"use client"

import React, { useEffect, useRef, useState } from "react"
import { Separator } from "./separator"
import { Quote, Star, ArrowLeft, ArrowRight } from "lucide-react"
import { motion, useAnimation, useInView } from "framer-motion"

export function AnimatedTestimonials({
  title = "Elsket af branchen",
  subtitle = "Tag ikke blot vores ord for det. Se hvad tømrermestre og byggeledere siger om vores system.",
  badgeText = "Anbefalet af fagfolk",
  testimonials = [],
  autoRotateInterval = 6000,
  trustedCompanies = [],
  trustedCompaniesTitle = "Vores brugere samarbejder med anerkendte grossister",
  className,
}) {
  const [activeIndex, setActiveIndex] = useState(0)

  // Refs for scroll animations
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const controls = useAnimation()

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  }

  // Trigger animations when section comes into view
  useEffect(() => {
    if (isInView) {
      controls.start("visible")
    }
  }, [isInView, controls])

  // Auto rotate testimonials
  useEffect(() => {
    if (autoRotateInterval <= 0 || testimonials.length <= 1) return

    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonials.length)
    }, autoRotateInterval)

    return () => clearInterval(interval)
  }, [autoRotateInterval, testimonials.length])

  if (testimonials.length === 0) {
    return null
  }

  return (
    <section ref={sectionRef} id="testimonials" className={`pt-32 pb-24 md:pt-40 overflow-hidden bg-slate-50/40 dark:bg-slate-950/20 ${className || ""}`}>
      <div className="max-w-[1440px] mx-auto px-8 md:px-16 lg:px-24 relative">

        <motion.div
          initial="hidden"
          animate={controls}
          variants={containerVariants}
          className="grid grid-cols-1 gap-16 w-full md:grid-cols-2 lg:gap-24"
        >
          {/* Left side: Heading and navigation */}
          <motion.div variants={itemVariants} className="flex flex-col justify-center">
            <div className="space-y-6">
              {badgeText && (
                <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-800 text-orange-400/80 dark:text-orange-300/80">
                  <Star className="mr-2 h-3.5 w-3.5 fill-orange-400/80 dark:fill-orange-300/80" />
                  <span>{badgeText}</span>
                </div>
              )}

              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-[clamp(2.5rem,4vw,3.5rem)] text-slate-900 dark:text-slate-100 leading-tight">
                {title}
              </h2>

              <p className="max-w-[600px] text-slate-500 dark:text-slate-400 md:text-xl/relaxed text-lg">
                {subtitle}
              </p>

              <div className="flex items-center gap-2 pt-6">
                {testimonials.map((_, index) => {
                  const isActive = activeIndex === index;
                  return (
                    <motion.button
                      key={index}
                      onClick={() => setActiveIndex(index)}
                      initial={false}
                      animate={{
                        width: isActive ? 32 : 8,
                        backgroundColor: isActive 
                          ? "var(--tw-colors-slate-900, #0f172a)" 
                          : "var(--tw-colors-slate-200, #e2e8f0)",
                      }}
                      transition={{
                        type: "tween",
                        duration: 0.4,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                      className="h-2 rounded-full outline-none flex-shrink-0 dark:!bg-slate-200 dark:hover:!bg-slate-300 min-w-0 p-0 m-0"
                      aria-label={`View testimonial ${index + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Right side: Testimonial cards */}
          <motion.div variants={itemVariants} className="relative h-full md:mr-10 min-h-[300px] md:min-h-[400px] mt-8 md:mt-0">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                className="absolute inset-0"
                initial={{ opacity: 0, x: 100 }}
                animate={{
                  opacity: activeIndex === index ? 1 : 0,
                  x: activeIndex === index ? 0 : 100,
                  scale: activeIndex === index ? 1 : 0.9,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{ zIndex: activeIndex === index ? 10 : 0 }}
              >
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-xl rounded-2xl p-8 h-full flex flex-col relative z-20">
                  <div className="mb-6 flex gap-1">
                    {Array(testimonial.rating)
                      .fill(0)
                      .map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                  </div>

                  <div className="relative mb-6 flex-1">
                    <p className="relative z-10 text-lg font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                      "{testimonial.content}"
                    </p>
                    <Quote className="absolute -bottom-4 -right-4 h-12 w-12 text-slate-100 dark:text-slate-800/50 z-0" />
                  </div>

                  <Separator className="my-6" />

                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{testimonial.name}</h3>
                    <p className="font-medium text-slate-500 dark:text-slate-400">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Decorative elements */}
            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-3xl bg-slate-100 dark:bg-slate-900 z-0 hidden md:block"></div>
            <div className="absolute -top-6 -right-6 h-32 w-32 rounded-3xl bg-slate-100 dark:bg-slate-900 z-0 hidden md:block"></div>
          </motion.div>
        </motion.div>

        {/* Logo cloud */}
        {trustedCompanies.length > 0 && (
          <motion.div variants={itemVariants} initial="hidden" animate={controls} className="mt-24 text-center">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8">{trustedCompaniesTitle}</h3>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-8">
              {trustedCompanies.map((company) => (
                <div key={company} className="text-xl md:text-2xl font-bold text-blue-200 dark:text-blue-900/50">
                  {company}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
