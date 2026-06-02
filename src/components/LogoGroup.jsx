export const LogoGroup = ({ size = 18 }) => {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 bg-blue rounded-lg flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 300 300">
          <path
            d="M100,200l-75,0c-6.63,0 -12.989,-2.634 -17.678,-7.322c-4.688,-4.688 -7.322,-11.047 -7.322,-17.678l0,-50c-0,-6.63 2.634,-12.989 7.322,-17.678c4.688,-4.688 11.047,-7.322 17.678,-7.322l75,-0l0,-75c-0,-6.63 2.634,-12.989 7.322,-17.678c4.688,-4.688 11.047,-7.322 17.678,-7.322l50,-0c6.63,-0 12.989,2.634 17.678,7.322c4.688,4.688 7.322,11.047 7.322,17.678l-0,75l75,0c6.63,-0 12.989,2.634 17.678,7.322c4.688,4.688 7.322,11.047 7.322,17.678l0,50c0,6.63 -2.634,12.989 -7.322,17.678c-4.688,4.688 -11.047,7.322 -17.678,7.322l-75,-0l0,75c0,6.63 -2.634,12.989 -7.322,17.678c-4.688,4.688 -11.047,7.322 -17.678,7.322l-50,0c-6.63,0 -12.989,-2.634 -17.678,-7.322c-4.688,-4.688 -7.322,-11.047 -7.322,-17.678l0,-75Z"
            style={{ fill: "#d4ee6d" }}
          />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-base font-extrabold text-charcoal tracking-wide uppercase leading-none">MilMera</span>
        <span className="text-[0.625rem] font-bold text-silver uppercase tracking-[0.3em] leading-none mt-1">Booking</span>
      </div>
    </div>
  );
};

export default LogoGroup;