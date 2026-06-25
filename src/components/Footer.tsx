import { FaGithub, FaLinkedin } from 'react-icons/fa';

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-slate-200 bg-white py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        
        {/* Name & Portfolio Link */}
        <p className="text-sm font-medium text-slate-500">
          Built by{' '}
          <a 
            href="https://sayan-kundu-portfolio.netlify.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-bold  text-purple-600 bg-clip-text transition-colors hover:text-purple-800 hover:underline"
          >
            Sayan Kundu
          </a>
        </p>

        {/* Social Links */}
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/sayank22" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-400 transition-colors hover:text-slate-900"
            title="GitHub Profile"
          >
            <FaGithub className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </a>
          
          <a 
            href="https://www.linkedin.com/in/sayan-kundu-70b5442b6" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-400 transition-colors hover:text-blue-700"
            title="LinkedIn Profile"
          >
            <FaLinkedin className="h-5 w-5" />
            <span className="sr-only">LinkedIn</span>
          </a>

          {/* <a 
            href="https://sayan-kundu-portfolio.netlify.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-400 transition-colors hover:text-purple-600"
            title="Portfolio Website"
          >
            <Globe className="h-5 w-5" />
            <span className="sr-only">Portfolio</span>
          </a> */}
        </div>

      </div>
    </footer>
  );
}